import { createLogger, EventEmitter, type Logger } from "@0x-jerry/utils";
import type { Common, IM } from "@my-bot/spec";
import { name as pkgName } from "../package.json";
import { Bot, webhookHandler } from "gramio";

export interface TelegramAdapterOptions {
  token: string;
  webhook?: string;
  debug?: boolean;
}

export class TelegramAdapter implements IM.Adapter {
  name = "Telegram";

  _events = new EventEmitter<IM.AdapterEvents>();

  _bot: Bot;

  _forwardCommands: Common.Command[] = [];

  readonly log?: Logger;

  constructor(readonly options: TelegramAdapterOptions) {
    if (options.debug) {
      this.log = createLogger(pkgName);
    }

    this._bot = new Bot(options.token);
    this._bot.on("message", (ctx) => {
      const content = ctx.text || "";
      const parsedCommand = parseCommand(content);
      if (parsedCommand) {
        const evt: IM.CommandEvent = {
          chatId: ctx.chat.id.toString(),
          messageId: ctx.id.toString(),
          userId: ctx.from?.id.toString() || "",
          command: parsedCommand.command,
          args: parsedCommand.args,
          send: async (content) => {
            return this.send(ctx.chatId.toString(), content);
          },
          reply: async (content) => {
            return this.reply(
              ctx.chatId.toString(),
              ctx.id.toString(),
              content,
            );
          },
        };

        this._events.emit("command", evt);
        return;
      }

      const msg: IM.MessageEvent = {
        chatId: ctx.chat.id.toString(),
        messageId: ctx.id.toString(),
        userId: ctx.from?.id.toString() || "",
        content: ctx.text || "",
        send: async (content) => {
          return this.send(ctx.chatId.toString(), content);
        },
        reply: async (content) => {
          return this.reply(ctx.chatId.toString(), ctx.id.toString(), content);
        },
      };

      this._events.emit("message", msg);
    });
  }

  async start(): Promise<void> {
    await this._bot.start({
      webhook: this.options.webhook,
    });

    console.log("telegram bot started");
  }

  async stop(): Promise<void> {
    await this._bot.stop();
    console.log("telegram bot stopped");
  }

  async _send(
    chatId: string,
    content: Common.AgentMessageContent,
    messageId?: string,
  ) {
    const bot = this._bot;

    if (typeof content === "string") {
      await sendText(content);
      return;
    }

    for (const part of content) {
      switch (part.type) {
        case "text":
          await sendText(part.text);
          break;
        case "file":
          if (part.data instanceof URL) {
            await sendText(part.data.toString());
          } else {
            const blob = new Blob([part.data], { type: part.mediaType });
            await sendFile(blob);
          }
          break;

        default:
          break;
      }
    }

    return;

    function sendFile(file: Blob) {
      return bot.api.sendDocument({
        chat_id: chatId,
        document: file,
        reply_parameters: messageId
          ? {
              message_id: parseInt(messageId),
            }
          : undefined,
      });
    }

    function sendText(content: string) {
      return bot.api.sendMessage({
        chat_id: chatId,
        text: content,
        reply_parameters: messageId
          ? {
              message_id: parseInt(messageId),
            }
          : undefined,
      });
    }
  }

  async send(
    chatId: string,
    content: Common.AgentMessageContent,
  ): Promise<void> {
    await this._send(chatId, content);
  }

  async reply(
    chatId: string,
    messageId: string,
    content: Common.AgentMessageContent,
  ): Promise<void> {
    await this._send(chatId, content, messageId);
  }

  async setCommands(commands: Common.Command[]): Promise<void> {
    this._forwardCommands = commands;

    await this._bot.api.setMyCommands({
      commands: commands,
    });
  }

  on<T extends keyof IM.AdapterEvents>(
    event: T,
    callback: (...args: IM.AdapterEvents[T]) => void,
  ): void {
    this._events.on(event, callback);
  }

  async handleWebhook(req: Request): Promise<Response> {
    if (this.options.webhook) {
      return webhookHandler(this._bot, "std/http")(req);
    } else {
      return new Response(null, { status: 200 });
    }
  }
}

function parseCommand(content: string) {
  const isCommand = content.startsWith("/");

  if (!isCommand) {
    return;
  }

  const [command, args] = content.split(" ");

  if (command) {
    return {
      command: command.slice(1),
      args,
    };
  }
}
