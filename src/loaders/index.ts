import path from "path";
import { promises as fs } from "fs";
// eslint-disable-next-line no-unused-vars
import type { CommandClient } from "eris";

// Loaders
import EventLoader from "./event.loader";
import CommandLoader from "./command.loader";

/**
 * Recursively gets all javascript files absolute paths
 * @param directory - Direcotry to search
 * @returns Absolute file paths
 */
async function recursivelyGetFilePaths(directory: string) {
  let filePaths: string[] = [];

  // Resolve path to absolute
  // Make sure it doesnt load paths relative to loader folder
  const directoryPath = path.resolve(__dirname, "../", directory);
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

// All loaders follow same type
export type Loader = {
  fileTypes: string[];
  load: (client: CommandClient, files: string[]) => Promise<number>;
};

/**
 * Loads all handlers.
 * Handlers include event and command handlers for now.
 * @param discordClient - Discord Bot CommandClient
 * @param moduleFolder - Modules folder
 */
export async function initHandlers(
  discordClient: CommandClient,
  moduleFolder: string
) {
  const filePaths = await recursivelyGetFilePaths(moduleFolder);
  const loaders: Loader[] = [EventLoader, CommandLoader];

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
