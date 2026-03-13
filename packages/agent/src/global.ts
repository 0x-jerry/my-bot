import { AgentManager } from "./agent";
import { loadConfig } from "./config/load";
import type { Config } from "./config/types";
import type { PrismaClient } from "./generated/prisma/client";
import { getDatabaseClient } from "./database";
import { SessionCronJobManager } from "./sessions/cron";
import { SessionStateManager } from "./sessions/state";

export interface GlobalVariables {
  agentManager: AgentManager;
  config: Config.Root;
  db: PrismaClient;
  sessionCronJobs: SessionCronJobManager;
  sessionStateManager: SessionStateManager;
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
  gv.sessionCronJobs = new SessionCronJobManager();
  gv.sessionStateManager = new SessionStateManager();

  return gv;
}
