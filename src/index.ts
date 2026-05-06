#! /usr/bin/env node

import * as fsPromises from "fs/promises";
import path from "path";
import process, { exit } from "process";
import chalk from "chalk";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";
import { getFileExtension, getNameFromPath } from "./utils.js";
import { pool } from "workerpool";
import { SaveElement } from "./types/SaveElement.js";
import { Options } from "./types/Options.js";
import { getAuthTokens, getOAuth2Client } from "./auth.js";
import { get } from "http";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const extension = getFileExtension(getNameFromPath(__filename));
const workerPool = pool(path.join(__dirname, `worker.${extension}`));

const program = new Command();

program
  .version(await getCurrentVersion())
  .description("A CLI application to upload files and folders to google drive")
  .option(
    "-p, --path <value>",
    "Path to the folder or file to save without saves file"
  )
  .option("-s, --savesPath <value>", "Path to the saves file")
  .option("-r, --relative", "Use a relative path")
  .option("-c, --credentialsPath", "Path to the credentials.json file")
  .parse(process.argv);

const options: Options = program.opts();

/**
 * Get current package.json version
 *
 * @return the current package.json version
 */
async function getCurrentVersion() {
  const packageJsonPath = path.join(__dirname, "..", "package.json");

  const packageJsonContents = await fsPromises.readFile(
    packageJsonPath,
    "utf8"
  );

  const packageJson = JSON.parse(packageJsonContents);

  return packageJson.version;
}

/**
 * Upload elements to google drive
 * @param {SaveElement} element Save element to upload
 */
async function saveElements(elements: SaveElement[]) {
  const credentials = await getAuthTokens();

  console.log(chalk.white.bold("credentials " + JSON.stringify(credentials)));

  // const oauth2Client = await getOAuth2Client(credentials);

  // console.log(chalk.white.bold("oauth2Client " + JSON.stringify(oauth2Client)));

  // const drive = google.drive({ version: "v3", auth: oauth2Client });

  //     await drive.files.get({
  //     fileId: "1n9s8l2m3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p",
  //   });

  elements.forEach((element) => {
    workerPool
      .exec("saveElement", [element, credentials])
      .then(() => {
        console.log(chalk.blue.bold(`Element saved ${element.path}`));
      })
      .catch((e: any) => {
        console.log(chalk.yellow.bold(`Error on worker ${e}`));
      })
      .then(async () => {
        await workerPool.terminate();
        exit();
      });
  });
}

/**
 * Get elements to upload google drive
 * @return {Promise<SaveElement[]>}
 */
async function getElements(): Promise<SaveElement[]> {
  let saveElements: SaveElement[] = [];

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
  await saveElements(await getElements());
}
