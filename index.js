const fs = require("fs").promises;
const fsNoPromise = require("fs");
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function listFiles(authClient) {
  const drive = google.drive({ version: "v3", auth: authClient });
  const res = await drive.files.list({
    pageSize: 10,
    fields: "nextPageToken, files(id, name)",
  });
  const files = res.data.files;
  if (files.length === 0) {
    console.log("No files found.");
    return;
  }

  console.log("Files:");
  files.map((file) => {
    console.log(`${file.name} (${file.id})`);
  });
}

async function getFile(authClient, fileName, options = {}) {
  const { mimeType = "folder" } = options;
  const drive = google.drive({ version: "v3", auth: authClient });
  const res = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.${mimeType}' and trashed = false and name = '${fileName}'`,
    fields: "nextPageToken, files(id, name)",
    spaces: "drive",
  });

  return res?.data?.files.length > 0 ? res?.data?.files[0] : null;
}

function getFileNameFromFilePath(filePath) {
  const splitPath = filePath.split("/");
  const res = splitPath.length - 1 >= 0 ? splitPath[splitPath.length - 1] : "";
  return res;
}

async function deleteFile(authClient, fileName, options = {}) {
  console.log(`Deleting ${fileName}`);
  const file = await getFile(authClient, fileName, options);

  if (file) {
    deleteFileById(authClient, file.data.id);
  }
}

async function deleteFileById(authClient, fileId) {
  if (fileId) {
    const drive = google.drive({ version: "v3", auth: authClient });
    await drive.files.delete({
      fileId: fileId,
    });
  }
}

async function uploadFile(authClient, filePath, folderId) {
  console.log(`Uploading file ${filePath}`);
  const fileName = getFileNameFromFilePath(filePath);
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };
  const media = {
    mimeType: "application/octet-stream",
    body: fsNoPromise.createReadStream(filePath),
  };
  const drive = google.drive({ version: "v3", auth: authClient });
  console.log(`Uploading file name ${fileName}`);
  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  });
  return file.data.id;
}

async function createDirectory(authClient, directoryName, folderId) {
  const finalDirectoryName = directoryName || "Autres";
  const fileMetadata = {
    name: finalDirectoryName,
    mimeType: "application/vnd.google-apps.folder",
    parents: folderId ? [folderId] : null,
  };
  console.log(`Creating directory ${finalDirectoryName}`);
  const drive = google.drive({ version: "v3", auth: authClient });
  return await drive.files.create({
    resource: fileMetadata,
    fields: "id",
  });
}

async function uploadDirectory(authClient, directoryPath, folderId) {
  const directoryName = getFileNameFromFilePath(directoryPath);
  const folder = await createDirectory(authClient, directoryName, folderId);

  const files = fsNoPromise.readdirSync(directoryPath);
  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    if (fsNoPromise.lstatSync(filePath).isDirectory()) {
      await uploadDirectory(authClient, filePath, folder.data.id);
    } else {
      try {
        await uploadFile(authClient, filePath, folder.data.id);
      } catch (error) {
        console.log(`An error occurred: ${error}`);
        fileId = null;
      }
    }
  }
}

/**
 * upload a folder to google drive
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function saveFolder(authClient, folderPath) {
  if (fsNoPromise.existsSync(folderPath)) {
    const folderName = getFileNameFromFilePath(folderPath);
    const folderToDelete = await getFile(authClient, folderName, {
      mimeType: "folder",
    });
    console.log("TO DELETE ", folderToDelete);
    uploadDirectory(authClient, folderPath);
    deleteFileById(folderToDelete?.id);
  }
}

/**
 * upload folders to google drive
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function saveFolders(authClient, foldersPath) {
  foldersPath.forEach((folderPath) => saveFolder(authClient, folderPath));
}

authorize()
  .then((auth) => saveFolders(auth, ["/mnt/d/Autres"]))
  .catch(console.error);
