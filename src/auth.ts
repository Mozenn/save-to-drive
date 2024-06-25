import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import os from "os";
import * as fs from "fs";
import path from "path";
import * as fsPromises from "fs/promises";
import chalk from "chalk";

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const SAVE_TO_DRIVE_PATH = path.join(os.homedir(), ".save-to-drive");
const TOKEN_PATH = path.join(SAVE_TO_DRIVE_PATH, "token.json");
let credentialsPath = path.join(SAVE_TO_DRIVE_PATH, "credentials.json");

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
async function setCredentialsPath(credentialsPathOverride?: string) {
  if (credentialsPathOverride && fs.existsSync(credentialsPathOverride)) {
    credentialsPath = credentialsPathOverride;
  }

  if (!fs.existsSync(credentialsPath)) {
    throw "No credentials found";
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client: any) {
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
export async function authorize() {
  if (!fs.existsSync(SAVE_TO_DRIVE_PATH)) {
    fs.mkdirSync(SAVE_TO_DRIVE_PATH);
  }

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
 * Renew auth token when invalid
 *
 */
export async function renewAuth() {
  console.log(chalk.yellow.bold("Renewing auth token"));
  if (fs.existsSync(SAVE_TO_DRIVE_PATH)) {
    fs.rmSync(TOKEN_PATH);
  }

  return await authorize();
}
