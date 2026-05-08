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
import { getAuthTokens } from "./auth.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const extension = getFileExtension(getNameFromPath(__filename));
const workerPool = pool(path.join(__dirname, `worker.${extension}`));
const program = new Command();
program
    .version(await getCurrentVersion())
    .description("A CLI application to upload files and folders to google drive")
    .option("-p, --path <value>", "Path to the folder or file to save without saves file")
    .option("-s, --savesPath <value>", "Path to the saves file")
    .option("-r, --relative", "Use a relative path")
    .option("-a, --app <value>", "Name of the app to open for authentication window (default: firefox)", "firefox")
    .option("-d, --debug", "Enable debug mode")
    .parse(process.argv);
const options = program.opts();
/**
 * Get current package.json version
 *
 * @return the current package.json version
 */
async function getCurrentVersion() {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJsonContents = await fsPromises.readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContents);
    return packageJson.version;
}
/**
 * Upload elements to google drive
 * @param {SaveElement} element Save element to upload
 */
async function saveElements(elements) {
    const credentials = await getAuthTokens(options.app || "firefox");
    elements.forEach((element) => {
        workerPool
            .exec("saveElement", [element, credentials])
            .then(() => {
            console.log(chalk.blue.bold(`Element saved ${element.path}`));
        })
            .catch((e) => {
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
    }
    else if (options.savesPath) {
        let configPath = options.relative
            ? path.join(process.cwd(), options.savesPath)
            : options.savesPath;
        const content = await fsPromises.readFile(configPath, "utf8");
        saveElements = JSON.parse(content);
    }
    else {
        console.log(chalk.red.bold(`No valid option has been passed as argument. Nothing has been saved`));
        return [];
    }
    return saveElements;
}
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
else {
    await saveElements(await getElements());
}
//# sourceMappingURL=index.js.map