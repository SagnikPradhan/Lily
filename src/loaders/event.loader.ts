// eslint-disable-next-line no-unused-vars
import type { Client } from "eris";
// eslint-disable-next-line no-unused-vars
import type { Loader } from "./index";

// Type for all event handlers
export type EventHandler = {
  name: string;
  listener: (bot: Client, ...args: unknown[]) => Promise<void> | void;
};

// File types this handler accepts
const fileTypes = ["event"];

/**
 * Loads event handler files
 *
 * @description Files should have name of following structure `filename.event.js`
 * Files should export `event` with `EventHandler` type
 * 
 * @example
 * import type { EventHandler } from "../../loaders/event.loader";
 *
 * export const event: EventHandler = {
 *  name: "ready",
 *  listener: (bot) => {
 *    console.log(`Logged in as ${bot.user.username}`);
 *  },
 * };
 * 
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
    const { event }: { event: EventHandler } = await import(filePath);
    const { listener, name } = event || {};
    if (
      typeof event != "object" ||
      typeof name != "string" ||
      typeof listener != "function"
    )
      throw new Error(`Invalid Event Handler ${filePath}`);
    else
      bot.on(name.toLowerCase(), (...args: unknown[]) =>
        listener(bot, ...args)
      );
  }

  return filesLength;
}

const EventLoader: Loader = { fileTypes, load };
export default EventLoader;
