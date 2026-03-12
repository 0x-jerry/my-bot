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

    mcps?: McpConfigs;
  }

  export interface McpConfigs {
    [mcpKey: string]: ToolSet.McpConfig;
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
    type: "openai-compatible";
    name?: string;
    apiKey?: string;
    baseUrl: string;
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
     *
     * Every 1 hour, add the current datetime to the message.
     */
    addDate?: boolean;

    /**
     * Max number of tool call iterations.
     * @default 100
     */
    maxIterations?: number;
  }
}

export namespace ToolSet {
  export type All = Mcp | Skill | Memory | Shell;

  export interface Mcp extends McpConfig {
    type: "mcp";

    /**
     * Root level mcp key
     */
    name?: string;
  }

  export interface EnvConfig {
    [key: string]: string;
  }

  export interface McpConfig {
    command?: string;
    args?: string[];
    env?: EnvConfig;
    envFile?: string[];

    remoteUrl?: string;
    remoteType?: "http" | "sse";

    /**
     * Filter tools by tool name.
     */
    filterTools?: string[];
  }
  export interface Skill {
    type: "skill";
  }

  export interface Memory {
    type: "memory";
    /**
     * The path to the memory file.
     */
    file?: string;
    /**
     * The URL of the memory server.
     */
    remoteUrl?: string;
  }

  export interface Shell {
    type: "shell";
  }
}
