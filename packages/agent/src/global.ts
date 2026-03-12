import { AgentManager } from "./agent";
import { loadConfig } from "./config/load";
import { Config } from "./config/types";
import type { PrismaClient } from "./generated/prisma/client";
import { getDatabaseClient } from "./database";

export interface GlobalVariables {
  agentManager: AgentManager;
  config: Config.Root;
  db: PrismaClient;
}

let initialized = false;

// @ts-expect-error initGlobalVariables will be called later
export const gv: GlobalVariables = {};

export interface InitGlobalVariablesOptions {
  confPath: string;
}

export async function initGlobalVariables(
  options: InitGlobalVariablesOptions,
): Promise<GlobalVariables> {
  if (initialized) {
    return gv;
  }

  initialized = true;
  gv.config = await loadConfig(options.confPath);
  gv.db = getDatabaseClient();

  gv.agentManager = new AgentManager();

  return gv;
}
