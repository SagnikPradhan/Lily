// eslint-disable-next-line no-unused-vars
import type {Command} from '@loader/command.loader'

export const command: Command = {
  label: "ping",
  generator: "hello",
  options: {
    description: "Check response time of bot"
  }
}
