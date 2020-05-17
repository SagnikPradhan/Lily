// eslint-disable-next-line no-unused-vars
import type { EventHandler } from "@loader/event.loader";

export const event: EventHandler = {
  name: "ready",
  listener: (bot) => {
    console.log(`Logged in as ${bot.user.username}`);
  },
};
