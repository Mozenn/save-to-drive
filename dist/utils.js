/**
 * Get name of a file or folder from a path
 *
 * @param {string} filePath
 * @return {Promise<string>}
 */
export function getNameFromPath(filePath) {
    const splitPath = filePath.split("/");
    const res = splitPath.length - 1 >= 0 ? splitPath[splitPath.length - 1] : "";
    return res;
}
/**
 * Get extension from a file name
 *
 * @param {string} fileName
 * @return {string}
 */
export function getFileExtension(fileName) {
    const splitName = fileName.split(".");
    const res = splitName.length - 1 >= 0 ? splitName[splitName.length - 1] : "";
    return res;
}
//# sourceMappingURL=utils.js.map