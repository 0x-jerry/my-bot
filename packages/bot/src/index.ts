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

const im = new TelegramAdapter({
  token: config.im.telegram.token!,
  debug: true,
});
const agent = new CagentAdapter({
  baseUrl: config.agent.cagent.url!,
});

const bridge = new BotBridge({
  im,
  agent,
  debug: true,
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
  try {
    const content = await readFile(config.persistFile, "utf8");
    const data = JSON.parse(content);
    bridge.restoreFromData(data);
  } catch (error) {
    console.warn("Failed to load data:", error);
    // ignore
  }
}

async function saveData() {
  const data = bridge.data();
  await writeFile(config.persistFile, JSON.stringify(data, null, 2));
}
