import type { Tool } from "ai";
import type { IDisposable } from "../types";

export namespace ToolSet {
  export type All = Mcp | Skill | Memory | Shell;

  export interface Mcp extends McpConfig {
    type: "mcp";

    /**
     * Root level mcp key
     */
    name?: string
  }

  export interface McpConfig {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
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

export interface LoadedToolset extends Partial<IDisposable> {
  toolset: Record<string, Tool>;
  instruction?: string;
}
