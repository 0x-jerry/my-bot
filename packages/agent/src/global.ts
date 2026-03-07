import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { AgentManager } from "./agent";
import { loadConfig } from "./config/load";
import { Config } from "./config/types";
import { PrismaClient } from "./generated/prisma/client";

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
  options: InitGlobalVariablesOptions
): Promise<GlobalVariables> {
  if (initialized) {
    return gv;
  }

  initialized = true;
  gv.config = await loadConfig(options.confPath);
  gv.db = new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL,
    }),
  });

  gv.agentManager = new AgentManager();

  return gv;
}
