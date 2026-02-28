import type { Common, IM } from "@my-bot/protocol";
import { Bot } from "gramio";

export class TelegramAdapter implements IM.Adapter {
  id = "telegram";
  name = "Telegram";

  _bot: Bot;

  _forwardCommands: Common.Command[] = [];

  constructor(token: string) {
    this._bot = new Bot(token);
  }

  async start(): Promise<void> {
    await this._bot.start()
    console.log('telegram bot started')
  }

  async stop(): Promise<void> {
    await this._bot.stop()
    console.log('telegram bot stopped')
  }

  async send(chatId: string, text: string): Promise<void> {
    await this._bot.api.sendMessage({
      chat_id: chatId,
      text,
    });
  }

  async reply(
    chatId: string,
    messageId: string,
    content: string
  ): Promise<void> {
    await this._bot.api.sendMessage({
      chat_id: chatId,
      text: content,
      reply_parameters: {
        message_id: parseInt(messageId),
      }
    });
  }

  async setCommands(commands: Common.Command[]): Promise<void> {
    this._forwardCommands = commands;

    await this._bot.api.setMyCommands({
      commands,
    });
  }

  on(event: "message", callback: (event: IM.MessageEvent) => void): void;
  on(event: "command", callback: (event: IM.CommandEvent) => void): void;
  on(event: string, callback: (...args: any[]) => void): void {
    if (event === "message") {
      this._bot.on("message", (ctx) => {
        const msg: IM.MessageEvent = {
          chatId: ctx.chat.id.toString(),
          messageId: ctx.id.toString(),
          userId: ctx.from?.id.toString() || "",
          content: ctx.text || "",
        };

        callback(msg);
      });
    } else if (event === "command") {
      if (this._forwardCommands.length) {
        const commandNames = this._forwardCommands.map((command) => command.command);
        this._bot.command(commandNames, (ctx) => {
          const command = ctx.text?.split(' ')[0].substring(1)

          if (!command) {
            return
          }

          const evt: IM.CommandEvent = {
            chatId: ctx.chat.id.toString(),
            messageId: ctx.id.toString(),
            userId: ctx.from?.id.toString() || "",
            command: command,
            args: ctx.args
          };
          callback(evt);
        })
      }
    }

    // TODO: Implement event handling
    console.log(`Registering event handler for ${event}`);
  }
}
