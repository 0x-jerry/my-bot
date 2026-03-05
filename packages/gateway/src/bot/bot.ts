import { BotBridge, BotBridgeData } from "@my-bot/bridge";
import { Agent, IM } from "@my-bot/spec";
import { getBotConfig, saveBotConfig } from "./database/config";

export interface BotOption {
  im: IM.Adapter;
  agent: Agent.Adapter;
  workspaceRoot: string;
  debug?: boolean;
  name: string;
}

export class Bot {
  name: string;
  bridge: BotBridge;

  constructor(options: BotOption) {
    this.name = options.name;
    this.bridge = new BotBridge(options);
  }

  async start() {
    const botData = await getBotConfig<BotBridgeData>(this.name);
    if (botData) {
      this.bridge.restoreFromData(botData);
    }

    await this.bridge.start();
  }

  async stop() {
    const botData = this.bridge.getData();
    await saveBotConfig(this.name, botData);

    await this.bridge.stop();
  }
}
