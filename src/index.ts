import { CommandClient } from "eris";
import { initHandlers } from "./loaders";

const main = async () => {
  // Configuration
  const discordToken = process.env.DISCORD_TOKEN || "";
  // Discord Client
  const discordClient = new CommandClient(discordToken, undefined, {
    prefix: "!"
  });
  // Initliase all handlers
  await initHandlers(discordClient, "modules");
  // Connect to gateway
  await discordClient.connect();
};

main().catch((err) => console.error(err));
