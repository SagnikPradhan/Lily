import path from "path";
import { promises as fs } from "fs";
// eslint-disable-next-line no-unused-vars
import type { Client } from "eris";

/**
 * Recursively gets all javascript files absolute paths
 * @param directory - Direcotry to search
 * @returns Absolute file paths
 */
async function recursivelyGetFilePaths(directory: string) {
  let filePaths: string[] = [];

  // Resolve path to absolute
  // Make sure it doesnt load paths relative to handler folder
  const directoryPath = path.resolve(
    __dirname,
    __dirname.endsWith("handlers") ? "../" : "",
    directory
  );
  const items = await fs.readdir(directoryPath);

  // Iterate over each item
  // If it is a file push to array
  // If directory call this function again
  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = path.resolve(directoryPath, items[itemIndex]);
    const itemStat = await fs.stat(item);

    if (itemStat.isDirectory())
      filePaths.push(...(await recursivelyGetFilePaths(item)));
    else if (itemStat.isFile()) {
      if (item.endsWith(".js")) filePaths.push(item);
    } else throw new Error(`Unable to load, Not a directory or file ${item}`);
  }

  return filePaths;
}

type Loader = {
  fileTypes: string[];
  load: (client: Client, files: string[]) => Promise<void>;
};

/**
 * Get all the loaders
 */
async function getLoaders() {
  // Read current directory's all files
  const files = await fs.readdir(__dirname);

  // Files all loader files and load them
  const loaderFiles: {
    path: string;
    file: Loader;
  }[] = await Promise.all(
    files
      .filter((file) => file.endsWith(".loader.js"))
      .map((file) => path.resolve(__dirname, file))
      .map(async (path) => ({
        path,
        file: await import(path),
      }))
  );

  // Validate and check all the files
  const invalidLoaderFilePaths = loaderFiles
    .filter(({ file }) => {
      // Check whether they have invalid properties
      return (
        !Array.isArray(file.fileTypes) ||
        file.fileTypes.some((fileType) => typeof fileType != "string") ||
        typeof file.load != "function"
      );
    })
    .map(({ path }) => path);

  // If all files are good return them
  if (invalidLoaderFilePaths.length > 0)
    throw new Error(`Invalid Loaders: ${invalidLoaderFilePaths}`);
  else return loaderFiles.map(({ file }) => file);
}

/**
 * Loads all handlers.
 * Handlers include event and command handlers for now.
 * @param discordClient - Discord Bot Client
 * @param moduleFolder - Modules folder
 */
export async function initHandlers(
  discordClient: Client,
  moduleFolder: string
) {
  const filePaths = await recursivelyGetFilePaths(moduleFolder);
  const loaders = await getLoaders();

  // Files are sorted with their Loaders
  const sortedFilePaths = new Map<Loader, string[]>();

  // Iterate over each handler and sort them
  for (
    let currentFilePathIndex = 0;
    currentFilePathIndex < filePaths.length;
    currentFilePathIndex++
  ) {
    const currentFilePath = filePaths[currentFilePathIndex];
    const fileType = currentFilePath.split(".").reverse()[1];
    const loader = loaders.find((loader) =>
      loader.fileTypes.includes(fileType)
    );

    if (loader) {
      const handlerFilesPaths = sortedFilePaths.get(loader);
      sortedFilePaths.set(loader, [
        ...(handlerFilesPaths || []),
        currentFilePath,
      ]);
    }
  }

  // Load now from sorted array
  for (const [loader, handlerFilesPaths] of sortedFilePaths.entries())
    await loader.load(discordClient, handlerFilesPaths);
}
