import type { Tool } from "ai";
import type { IDisposable } from "../types";
export type { ToolSet } from "../config/types";

export interface LoadedToolset extends Partial<IDisposable> {
  toolset: Record<string, Tool>;
  instruction?: string;
}
