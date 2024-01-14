#! /usr/bin/env node
import * as fsPromises from "fs/promises";
import path from "path";
import os from "os";
import * as fs from "fs";
import process from "process";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import chalk from "chalk";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";
const __dirname = dirname(fileURLToPath(import.meta.url));
// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const TOKEN_PATH = path.join(__dirname, "..", "token.json");
let credentialsPath = path.join(
  os.tmpdir(),
  ".save-to-drive",
  "credentials.json"
);
const program = new Command();
program
  .version("1.0.0")
  .description("A CLI application to upload files and folders to google drive")
  .option(
    "-p, --path <value>",
    "Path to the folder or file to save without saves file"
  )
  .option("-s, --savesPath <value>", "Path to the saves file")
  .option("-r, --relative", "Use a relative path")
  .option("-c, --credentialsPath", "Path to the credentials.json file")
  .parse(process.argv);
const options = program.opts();
/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fsPromises.readFile(TOKEN_PATH, "utf8");
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}
/**
 * Set credentials.json path
 */
async function setCredentialsPath() {
  if (options.credentialsPath && fs.existsSync(options.credentialsPath)) {
    credentialsPath = options.credentialsPath;
  }
  if (!fs.existsSync(credentialsPath)) {
    console.log("Cred path", credentialsPath);
    throw "No credentials found";
  }
}
/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fsPromises.readFile(credentialsPath, "utf8");
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fsPromises.writeFile(TOKEN_PATH, payload);
}
/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  await setCredentialsPath();
  let savedClient = await loadSavedCredentialsIfExist();
  if (savedClient) {
    return savedClient;
  }
  let client = await authenticate({
    scopes: SCOPES,
    keyfilePath: credentialsPath,
  });
  if (client?.credentials) {
    await saveCredentials(client);
  }
  return client;
}
/**
 * Get google drive file data of the first file with name fileName
 *
 * @param {OAuth2Client} client
 * @param {string} fileName
 * @param {SaveOptions} options
 * @return {Promise<any>}
 */
async function getFile(authClient, fileName, options) {
  const { mimeType = "folder" } = options;
  const drive = google.drive({ version: "v3", auth: authClient });
  const res = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.${mimeType}' and trashed = false and name = '${fileName}'`,
    fields: "nextPageToken, files(id, name, modifiedTime)",
    spaces: "drive",
  });
  return res?.data?.files?.length && res?.data?.files?.length > 0
    ? res?.data?.files[0]
    : null;
}
/**
 * Get name of a file or folder from a path
 *
 * @param {string} filePath
 * @return {Promise<string>}
 */
function getNameFromPath(filePath) {
  const splitPath = filePath.split("/");
  const res = splitPath.length - 1 >= 0 ? splitPath[splitPath.length - 1] : "";
  return res;
}
/**
 * Delete a file by id
 *
 * @param {OAuth2Client} client
 * @param {string} filePath
 * @return {Promise<string>}
 */
async function deleteFileById(authClient, fileId) {
  if (fileId) {
    console.log(chalk.blue.bold(`Deleting file ${fileId}`));
    const drive = google.drive({ version: "v3", auth: authClient });
    await drive.files.delete({
      fileId: fileId,
    });
  }
}
/**
 * Upload a file to drive
 *
 * @param {OAuth2Client} client
 * @param {string} filePath
 * @param {string} folderId
 * @return {Promise<string>}
 */
async function uploadFile(authClient, filePath, folderId) {
  console.log(chalk.blue.bold(`Uploading file ${filePath}`));
  const fileName = getNameFromPath(filePath);
  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : [],
  };
  const media = {
    mimeType: "application/octet-stream",
    body: fs.createReadStream(filePath),
  };
  const drive = google.drive({ version: "v3", auth: authClient });
  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id",
  });
  return file?.data?.id;
}
/**
 * Create directory in google drive
 *
 * @param {OAuth2Client} client
 * @param {string} directoryName
 * @param {string} folderId
 * @return {Promise<any>}
 */
async function createFolder(authClient, directoryName, folderId) {
  const finalDirectoryName = directoryName || "Autres";
  const fileMetadata = {
    name: finalDirectoryName,
    mimeType: "application/vnd.google-apps.folder",
    parents: folderId ? [folderId] : null,
  };
  console.log(chalk.blue.bold(`Creating directory ${finalDirectoryName}`));
  const drive = google.drive({ version: "v3", auth: authClient });
  return await drive.files.create({
    requestBody: fileMetadata,
    fields: "id",
  });
}
/**
 * Upload a directory from filesystem to google drive
 *
 * @param {OAuth2Client} authClient
 * @param {string} folderPath
 * @param {string} parentfolderId
 */
async function uploadFolder(authClient, folderPath, folderId) {
  const folderName = getNameFromPath(folderPath);
  const folder = await createFolder(authClient, folderName, folderId);
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    if (fs.lstatSync(filePath).isDirectory() && folder?.data?.id) {
      await uploadFolder(authClient, filePath, folder.data.id);
    } else {
      try {
        if (folder?.data?.id) {
          await uploadFile(authClient, filePath, folder.data.id);
        }
      } catch (error) {
        console.log(chalk.red.bold(`An error occurred: ${error}`));
      }
    }
  }
}
/**
 * Upload an element to google drive
 *
 * @param {OAuth2Client} authClient
 * @param {SaveElement} element Save element to upload
 */
async function uploadElement(authClient, element) {
  if (fs.lstatSync(element.path).isDirectory()) {
    await uploadFolder(
      authClient,
      element.path,
      element?.options?.baseFolderId
    );
  } else {
    try {
      await uploadFile(
        authClient,
        element.path,
        element?.options?.baseFolderId
      );
    } catch (error) {
      console.log(chalk.red.bold(`An error occurred: ${error}`));
    }
  }
}
/**
 * Upload an element to google drive
 * @param {OAuth2Client} authClient An authorized OAuth2 client
 * @param {SaveElement} element Save element to upload
 */
async function saveElement(authClient, element) {
  if (fs.existsSync(element.path)) {
    const elementName = getNameFromPath(element.path);
    const elementToDelete = await getFile(
      authClient,
      elementName,
      element.options
    );
    await uploadElement(authClient, element);
    if (
      element.options.deleteExisting ||
      element.options.deleteExisting === undefined
    ) {
      if (elementToDelete?.id) {
        deleteFileById(authClient, elementToDelete.id);
      }
    }
  }
}
/**
 * Upload elements to google drive
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @param {SaveElement} element Save element to upload
 */
async function saveElements(authClient, elements) {
  elements.forEach((element) => saveElement(authClient, element));
}
/**
 * Get elements to upload google drive
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @param {SaveElement} element Save element to upload
 * @return {Promise<any>}
 */
async function getElements() {
  let saveElements = [];
  if (options.path) {
    saveElements = [
      {
        path: options.relative
          ? path.join(process.cwd(), options.path)
          : options.path,
        options: {
          mimeType: "folder",
        },
      },
    ];
  } else if (options.savesPath) {
    let configPath = options.relative
      ? path.join(process.cwd(), options.savesPath)
      : options.savesPath;
    const content = await fsPromises.readFile(configPath, "utf8");
    saveElements = JSON.parse(content);
  } else {
    console.log(
      chalk.red.bold(
        `No valid option has been passed as argument. Nothing has been saved`
      )
    );
    return [];
  }
  return saveElements;
}
if (!process.argv.slice(2).length) {
  program.outputHelp();
} else {
  authorize()
    .then(async (auth) => saveElements(auth, await getElements()))
    .catch(console.error);
}
//# sourceMappingURL=index.js.map
