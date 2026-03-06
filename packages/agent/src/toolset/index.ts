import { ToolSet } from "ai";
import { Config } from "../config/types";
import { createMemoryToolset } from "./memory";

/**
 * Resolve toolset from config.
 */
export async function resolveToolsets(
  toolsets?: Config.ToolsetConfig[],
): Promise<ToolSet> {
  const loadedToolset: ToolSet = {};

  if (!toolsets?.length) return loadedToolset;

  for (const toolset of toolsets) {
    try {
      await loadToolset(toolset);
    } catch (error) {
      console.error(`Failed to load toolset ${toolset.type}`, error);
    }
  }

  return loadedToolset;

  async function loadToolset(tool: Config.ToolsetConfig) {
    switch (tool.type) {
      case "memory":
        Object.assign(loadedToolset, await createMemoryToolset(tool));
        break;
    }
  }
}
