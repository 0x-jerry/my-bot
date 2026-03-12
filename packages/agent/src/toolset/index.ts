import type { Config } from "../config/types";
import { createMemoryToolset } from "./memory";
import { createMCPToolset } from "./mcp";
import { createShellToolset } from "./shell";
import { createSkillToolset } from "./skill";
import type { LoadedToolset } from "./types";

/**
 * Resolve toolset from config.
 */
export async function loadToolsets(
  toolsetsConfig?: Config.ToolsetConfig[],
): Promise<LoadedToolset[]> {
  const loadedToolset: LoadedToolset[] = [];

  if (!toolsetsConfig?.length) return loadedToolset;

  for (const toolsetConfig of toolsetsConfig) {
    try {
      const toolset = await loadToolset(toolsetConfig);
      loadedToolset.push(toolset);
    } catch (error) {
      console.error("Failed to load toolset", toolsetConfig, error);
    }
  }

  return loadedToolset;
}

async function loadToolset(tool: Config.ToolsetConfig): Promise<LoadedToolset> {
  switch (tool.type) {
    case "memory":
      return await createMemoryToolset(tool);
    case "mcp":
      return await createMCPToolset(tool);
    case "shell":
      return await createShellToolset(tool);
    case "skill":
      return await createSkillToolset(tool);
    default:
      return {
        toolset: {},
      };
  }
}
