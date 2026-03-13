import { TelegramAdapter } from "@my-bot/adapter-telegram";
import { Bot } from "./bot";
import { Hono } from "hono";
import { MyAgentAdapter } from "@my-bot/adapter-agent";

export interface CreateBotOptions {
  debug?: boolean;
}

function createBot(opt: CreateBotOptions = {}) {
  const debug = opt.debug;

  const im = new TelegramAdapter({
    token: process.env.TELEGRAM_BOT_TOKEN!,
    webhook: process.env.TELEGRAM_WEBHOOK,
    debug,
  });

  const agent = new MyAgentAdapter({
    baseUrl: process.env.MY_AGENT_BASE_URL!,
    debug,
  });

  const bot = new Bot({
    name: "my-bot",
    im,
    agent,
    workspaceRoot: process.env.WORKSPACE_ROOT!,
    debug,
  });

  return bot;
}

export function setupBot(app: Hono) {
  const bot = createBot({
    debug: true,
  });

  app.post("/webhook/tg", (c) => {
    return bot.im.handleWebhook(c.req.raw);
  });

  return bot;
}
