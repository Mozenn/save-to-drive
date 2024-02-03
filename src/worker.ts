import { worker, isMainThread } from "workerpool";
import chalk from "chalk";
import { google } from "googleapis";
import * as fs from "fs";
import path from "path";
import { SaveOptions } from "./types/SaveOptions.js";
import { getNameFromPath } from "./utils.js";
import { SaveElement } from "./types/SaveElement.js";
import { authorize } from "./auth.js";

function generateRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateRandomColor() {
  return {
    r: generateRandomNumber(0, 255),
    g: generateRandomNumber(0, 255),
    b: generateRandomNumber(0, 255),
  };
}

const { r, g, b } = generateRandomColor();
const logWithColor = chalk.rgb(r, g, b).bold;

/**
 * Get google drive file data of the first file with name fileName
 *
 * @param {OAuth2Client} client
 * @param {string} fileName
 * @param {SaveOptions} options
 * @return {Promise<any>}
 */
async function getFile(
  authClient: any,
  fileName: string,
  options: SaveOptions
) {
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
 * Delete a file by id
 *
 * @param {OAuth2Client} client
 * @param {string} filePath
 * @return {Promise<string>}
 */
async function deleteFileById(authClient: any, fileId: string) {
  if (fileId) {
    console.log(logWithColor(`Deleting file ${fileId}`));
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
async function uploadFile(
  authClient: any,
  filePath: string,
  folderId?: string
): Promise<string | null | undefined> {
  console.log(logWithColor(`Uploading file ${filePath}`));
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
async function createFolder(
  authClient: any,
  directoryName: string,
  folderId?: string
) {
  const finalDirectoryName = directoryName || "Autres";
  const fileMetadata = {
    name: finalDirectoryName,
    mimeType: "application/vnd.google-apps.folder",
    parents: folderId ? [folderId] : null,
  };
  console.log(logWithColor(`Creating directory ${finalDirectoryName}`));
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
 * @param {string} folderId
 * @param {string} toIgnore
 */
async function uploadFolder(
  authClient: any,
  folderPath: string,
  folderId?: string,
  toIgnore?: string[]
) {
  const folderName = getNameFromPath(folderPath);
  const folder = await createFolder(authClient, folderName, folderId);

  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const fileName = getNameFromPath(filePath);
    if (toIgnore?.includes(fileName)) {
      console.log(chalk.yellow.bold(`File ignored: ${fileName}`));
      continue;
    }
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
async function uploadElement(authClient: any, element: SaveElement) {
  if (fs.lstatSync(element.path).isDirectory()) {
    await uploadFolder(
      authClient,
      element.path,
      element?.options?.baseFolderId,
      element?.options?.ignore
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
 * @param {SaveElement} element Save element to upload
 */
async function saveElement(element: SaveElement) {
  if (fs.existsSync(element.path)) {
    const elementName = getNameFromPath(element.path);
    console.log(logWithColor(`Is main thread ? ${isMainThread}`));

    const authClient = await authorize();

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

worker({
  saveElement: saveElement,
});
