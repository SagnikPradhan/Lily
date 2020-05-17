// eslint-disable-next-line no-unused-vars
import type { Client } from "eris";
// eslint-disable-next-line no-unused-vars
import type { Loader } from "./index";

// File types this handler accepts
const fileTypes = ["event"];

/**
 * Loads event handler files
 *
 * Files should have name of following structure `filename.event.js`
 * Files should export an `eventName` string and `listener` function
 * In the listener function first argument is always the discord client itself
 * while other arguments remain specific to the event
 * @param bot - Discord Bot Client
 * @param files- Absolute path of all the files
 * @returns Number of events loaded
 */
async function load(bot: Client, files: string[]): Promise<number> {
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

const EventLoader: Loader = { fileTypes, load };
export default EventLoader;
