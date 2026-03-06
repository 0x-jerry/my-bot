import { ToolLoopAgent } from "ai";
import { Config } from "../config/types";
import { IDisposable } from "../types";

export interface MyAgent extends IDisposable {
  id: string
  config: Config.AgentConfig;
  instance: ToolLoopAgent;
}
