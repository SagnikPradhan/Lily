import { CommandClient } from "eris";
// eslint-disable-next-line no-unused-vars
import type { Client } from "eris";
import { promises as fs } from "fs";
import path from "path";

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
const loadEvents = async (bot: Client, eventDirectories: string[]) => {
  let totalNumberOfEvents = 0;
  // Iterate over all the directories containing events
  for (
    let currentDirIndex = 0;
    currentDirIndex < eventDirectories.length;
    currentDirIndex++
  ) {
    const eventDirectory = eventDirectories[currentDirIndex];

    // Get all the events
    const eventsDirectoryPath = path.join(__dirname, eventDirectory);
    const eventsDirectory = (
      await fs.readdir(eventsDirectoryPath)
    ).filter((name) => name.endsWith(".event.js"));

    // Load all the events
    const numberOfEvents = eventsDirectory.length;
    for (let index = 0; index < numberOfEvents; index++) {
      const fileName = eventsDirectory[index];
      const filePath = path.join(eventsDirectoryPath, fileName);
      const {
        eventName,
        listener,
      }: { eventName: string; listener: Function } = await import(filePath);
      // Validate file
      if (typeof eventName != "string" || typeof listener != "function")
        throw new Error(`Invalid File: ${filePath}`);
      else
        bot.on(eventName.toLowerCase(), (...args: unknown[]) =>
          listener(bot, ...args)
        );
    }

    totalNumberOfEvents += numberOfEvents;
  }
  return totalNumberOfEvents
};

const main = async () => {
  // Configuration
  const discordToken = process.env.DISCORD_TOKEN || "";
  // Discord Client
  const discordClient = new CommandClient(discordToken);
  // Load all the events
  const totalNumberOfEvents = await loadEvents(discordClient, ["events"]);
  console.log(`Loaded ${totalNumberOfEvents} Event Handlers`);
  // Connect to gateway
  await discordClient.connect();
};

main().catch((err) => console.error(err));
