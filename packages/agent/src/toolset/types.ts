import { Awaitable } from "@0x-jerry/utils";
import { Tool } from "ai";
import { IDisposable } from "../types";

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

export interface LoadedToolset extends Partial<IDisposable> {
  toolset: Record<string, Tool>;
  instruction?: string;
}
