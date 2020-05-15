import { loadEvents } from "./event.handler";
// eslint-disable-next-line no-unused-vars
import type { Client } from "eris";

export async function initHandlers(
  discordClient: Client,
  moduleFolder: string
) {
  // Load all events
  const totalNumberOfEvents = await loadEvents(discordClient, [moduleFolder]);
  console.log(`Loaded ${totalNumberOfEvents} Event Handlers`);
}
