import { Tool } from "ai";

export namespace ToolSet {
  export type All = Mcp | Skill | Memory | Shell;

  export interface Mcp {
    type: "mcp";

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

export interface LoadedToolset {
  toolset: Record<string, Tool>;
  instruction?: string;
}
