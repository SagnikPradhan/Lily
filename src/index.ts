import { CommandClient } from "eris";
import { loadEvents } from "./handlers";

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
