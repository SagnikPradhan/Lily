import { CommandClient } from "eris";
import { initHandlers } from "./handlers";

const main = async () => {
  // Configuration
  const discordToken = process.env.DISCORD_TOKEN || "";
  // Discord Client
  const discordClient = new CommandClient(discordToken);
  // Initliase all handlers
  await initHandlers(discordClient, "modules");
  // Connect to gateway
  await discordClient.connect();
};

main().catch((err) => console.error(err));
