import { ToolSet } from "../toolset/types";

export namespace Config {
  export interface Root {
    /**
     * Enable logging.
     */
    loggingLevel?: "debug" | "info" | "warn" | "error";

    /**
     * ProviderKey => ProviderConfig
     */
    provider?: ProviderConfigs;
    /**
     * AgentKey => AgentConfig
     */
    agents?: AgentConfigs;
  }

  export interface ProviderConfigs {
    [providerKey: string]: ProviderConfig;
  }

  export interface AgentConfigs {
    [agentKey: string]: AgentConfig;
  }

  export interface ProviderConfig {
    /**
     * Only support openai compatible providers.
     */
    type?: "openai";
    apiKey?: string;
    baseUrl?: string;
  }

  export interface AgentConfig {
    /**
     * syntax: providerKey/modelName
     * eg: openai/gpt-3.5-turbo
     */
    model: string;
    name?: string;
    instruction?: string;

    /**
     * Add extra context to the message.
     */
    context?: AgentContextConfig;

    toolset?: ToolsetConfig[];
  }

  export type ToolsetConfig = ToolSet.All;

  export interface AgentContextConfig {
    /**
     * Load extra prompts from files.
     */
    extraPrompts?: string[];

    /**
     * Add current date to the message.
     */
    addDate?: boolean;

    /**
     * Max number of tool call iterations.
     * @default 20
     */
    maxIterations?: number;

    /**
     * Max number of messages to keep in history.
     */
    maxHistoryMessages?: number;
  }
}
