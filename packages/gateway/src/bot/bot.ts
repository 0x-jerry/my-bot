import { BotBridge, type BotBridgeData } from "./bridge";
import type { Agent, IM } from "@my-bot/spec";
import { getBotData, saveBotData } from "./database/data";

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
    const botData = await getBotData<BotBridgeData>(this.name);
    if (botData) {
      this.bridge.restoreFromData(botData);
    }

    await this.bridge.start();
  }

  async stop() {
    const botData = this.bridge.getData();
    await saveBotData(this.name, botData);

    await this.bridge.stop();
  }
}
