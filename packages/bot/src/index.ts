import { BotBridge } from "@my-bot/bridge";
import { CagentAdapter } from "@my-bot/cagent";
import { TelegramAdapter } from "@my-bot/telegram";
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setupGlobalProxyAgent } from "./proxy";

setupGlobalProxyAgent();

const config = {
  persistFile: path.resolve("./data.json"),
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

await loadData();
await bridge.start();

// Graceful shutdown
process.on("SIGINT", async () => {
  await saveData();
  bridge.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await saveData();
  await bridge.stop();
  process.exit(0);
});

async function loadData() {
  const content = await readFile(config.persistFile, "utf8");
  const data = JSON.parse(content);
  bridge.restoreFromData(data);
}

async function saveData() {
  const data = bridge.data();
  await writeFile(config.persistFile, JSON.stringify(data, null, 2));
}
