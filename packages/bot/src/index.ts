import { BotBridge } from "@my-bot/bridge";
import { CagentAdapter } from "@my-bot/cagent";
import { TelegramAdapter } from "@my-bot/telegram";
import "dotenv/config";
import { setupGlobalProxyAgent } from "./proxy";

setupGlobalProxyAgent();

const config = {
  im: {
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN,
    },
  },
  agent: {
    cagent: {
      url: process.env.CAGENT_BASE_URL,
    },
  },
};

const im = new TelegramAdapter(config.im.telegram.token!);
const agent = new CagentAdapter({
  baseUrl: config.agent.cagent.url!,
});

const bridge = new BotBridge({
  im,
  agent,
});

await bridge.start();

// Graceful shutdown
process.on("SIGINT", () => {
  bridge.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await bridge.stop();
  process.exit(0);
});
