import { AgentManager } from "./agent";
import { loadConfig } from "./config/load";
import { Config } from "./config/types";

export interface GlobalVariables {
  agentManager: AgentManager;
  config: Config.Root;
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

  gv.agentManager = new AgentManager();
  gv.config = await loadConfig(options.confPath);

  return gv;
}
