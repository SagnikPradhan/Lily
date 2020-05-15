import { promises as fs } from "fs";
import path from "path";
// eslint-disable-next-line no-unused-vars
import type { Client } from "eris";

/**
 * Recursively loads all files in the directory ending with `.event.js`
 *
 * @param directory - Direcotry to search
 * @returns Absolute file paths
 */
export async function recursivelyGetEventFilePaths(directory: string) {
  let filePaths: string[] = [];

  // Resolve path to absolute
  // Make sure it doesnt load paths relative to handler folder
  const directoryPath = path.resolve(__dirname, __dirname.endsWith('handlers') ? '../' : '', directory);
  const items = await fs.readdir(directoryPath);

  // Iterate over each item
  // If it is a file push to array
  // If directory call this function again
  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = path.resolve(directoryPath, items[itemIndex]);
    const itemStat = await fs.stat(item);

    if (itemStat.isDirectory())
      filePaths.push(...(await recursivelyGetEventFilePaths(item)));
    else if (itemStat.isFile()) {
      if (item.endsWith("event.js")) filePaths.push(item);
    } else throw new Error(`Unable to load, Not a directory or file ${item}`);
  }

  return filePaths;
}

/**
 * Loads event handler files
 *
 * Files should have name of following structure `filename.event.js`
 * Files should export an `eventName` string and `listener` function
 * In the listener function first argument is always the discord client itself
 * while other arguments remain specific to the event
 * @param bot - Discord Bot Client
 * @param eventDirectories - Directories containing event handlers
 * @returns Number of events loaded
 */
export async function loadEvents(bot: Client, eventDirectories: string[]) {
  // Iterate over all the directories containing events and get all the file paths
  const files: string[] = (
    await Promise.all(
      eventDirectories.map((dir) => recursivelyGetEventFilePaths(dir))
    )
  ).flat();

  const filesLength = files.length;
  // Load each file
  // Also validate them
  for (let fileIndex = 0; fileIndex < filesLength; fileIndex++) {
    const filePath = files[fileIndex];
    const {
      eventName,
      listener,
    }: { eventName: string; listener: Function } = await import(filePath);
    if (typeof eventName != "string" && typeof listener != "function")
      throw new Error(`Invalid Event Handler ${filePath}`);
    else
      bot.on(eventName.toLowerCase(), (...args: unknown[]) =>
        listener(bot, ...args)
      );
  }

  return filesLength;
}
