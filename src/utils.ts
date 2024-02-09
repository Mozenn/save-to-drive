/**
 * Get name of a file or folder from a path
 *
 * @param {string} filePath
 * @return {Promise<string>}
 */
export function getNameFromPath(filePath: string) {
  const splitPath = filePath.split("/");
  const res = "";
  if (splitPath.length - 1 >= 0) {
    for (let i = splitPath.length - 1; i >= 0; i--) {
      if (splitPath[i] && splitPath[i] != "") {
        return splitPath[i];
      }
    }
  }

  return res;
}

/**
 * Get extension from a file name
 *
 * @param {string} fileName
 * @return {string}
 */
export function getFileExtension(fileName: string) {
  const splitName = fileName.split(".");
  const res = splitName.length - 1 >= 0 ? splitName[splitName.length - 1] : "";
  return res;
}
