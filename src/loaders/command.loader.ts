// eslint-disable-next-line no-unused-vars
import type { Loader } from "./index";
// eslint-disable-next-line no-unused-vars
import type { CommandOptions, CommandGenerator } from "eris";

export type Command = {
  label: string;
  generator: CommandGenerator;
  options?: CommandOptions;
};

const CommandLoader: Loader = {
  fileTypes: ["command"],
  load: async (discordClient, files) => {
    // Iterate over each file and register them
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const currentFile = files[fileIndex];
      const { command }: { command: Command } = await import(currentFile);
      const { label, generator, options } = command || {};
      // Validate the files
      if (
        typeof command != "object" ||
        typeof label != "string" ||
        typeof generator == "undefined" ||
        (typeof options != "undefined" && typeof options != "object")
      )
        throw new Error(`Invalid Command: ${currentFile}`);
      else {
        discordClient.registerCommand(label, generator, options);
      }
    }

    return files.length;
  },
};

export default CommandLoader;
