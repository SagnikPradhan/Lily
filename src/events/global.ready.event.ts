// eslint-disable-next-line no-unused-vars
import type { Client } from "eris";

export const eventName = "ready";

export const listener = (bot: Client) => {
  console.log(`Logged in as ${bot.user.username}`);
};
