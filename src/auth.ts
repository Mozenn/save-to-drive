import { google } from "googleapis";
import os from "os";
import * as fs from "fs";
import path from "path";
import * as fsPromises from "fs/promises";
import chalk from "chalk";
import * as http from "http";
import open from "open";
import * as url from "url";
import { Credentials } from "google-auth-library";

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
 * Get an auth token using oauth2 flow, and return the credentials
 *
 */
export async function getAuthTokens(): Promise<Credentials> {

  const { oauth2Client, redirectUri } = createOAuth2Client();

  console.log(chalk.white.bold("oauth2Client created with env vars"));

  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES.join(' '),
  });

  console.log(chalk.white.bold("authorizeUrl generated: " + authorizeUrl));

  const server = http
    .createServer(async (req, res) => {
      try {
        console.log(chalk.white.bold("request received: " + req.url));
        const redirectUriLastSegment = redirectUri.split('/').slice(-1)[0];
        if (req.url && req.url.indexOf(`/${redirectUriLastSegment}`) > -1) {
          const qs = new url.URL(req.url, 'http://localhost:3000') // TODO replace by redirectUri or update redirectUri to this?
            .searchParams;
          res.end('Authentication successful! Please return to the console.');
          const { tokens } = await oauth2Client.getToken(qs.get('code') || '');
          console.log(chalk.white.bold("token: " + JSON.stringify(tokens)));
          oauth2Client.setCredentials(tokens);
          server.emit('token');
          // Promise.resolve(oauth2Client);
        }
      } catch (e) {
        // TODO?
        // Promise.reject(e);
      }
    })
    .listen(3000, async () => {
      console.log(chalk.white.bold("server listening on port 3000"));
    });

  // TODO handle opened app not returning 
  console.log(chalk.white.bold("opening " + authorizeUrl));
  await open(authorizeUrl, { app: 'firefox', wait: true });
  console.log(chalk.white.bold("done"));

  if (oauth2Client.credentials) {
    server.close();
  } else {
    await new Promise<void>((resolve) => {
      server.on('token', () => {
        server.close();
        console.log(chalk.white.bold("server closed"));
        resolve();
      });
    });
  }

  console.log(chalk.white.bold("oauth2Client creds" + JSON.stringify(oauth2Client.credentials)));

  return oauth2Client.credentials;
}


/**
 * Get an oauth2 client with the given credentials
 *
 */
export async function getOAuth2Client(credentials: Credentials) {
  const { oauth2Client } = createOAuth2Client();
  oauth2Client.setCredentials(credentials);
  return oauth2Client;
}

function createOAuth2Client() {
  // TODO use oauth2.keys.json if env vars don't work as fallback?
  // TODO update env setup bashrc with these once working
  const redirectUri = process.env.STD_REDIRECT_URI || "http://localhost:3000/callback";
  const oauth2Client = new google.auth.OAuth2({ clientId: process.env.STD_CLIENT_ID, clientSecret: process.env.STD_CLIENT_SECRET, redirectUri });

  return { oauth2Client, redirectUri };
}


/**
 * Renew auth token when invalid
 *
 */
// export async function renewAuth() {
//   // TODO refactor using oauth2Client flow 
//   console.log(chalk.yellow.bold("Renewing auth token"));
//   if (fs.existsSync(SAVE_TO_DRIVE_PATH)) {
//     fs.rmSync(TOKEN_PATH);
//   }

//   return await authorize();
// }
