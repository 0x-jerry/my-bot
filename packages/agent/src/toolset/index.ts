import { ToolSet } from "ai";
import { Config } from "../config/types";
import { createMemoryToolset } from "./memory";
import { createMCPToolset } from "./mcp";
import { createShellToolset } from "./shell";
import { createSkillToolset } from "./skill";

/**
 * Resolve toolset from config.
 */
export async function resolveToolsets(
  toolsetsConfig?: Config.ToolsetConfig[],
): Promise<ToolSet> {
  const loadedToolset: ToolSet = {};

  if (!toolsetsConfig?.length) return loadedToolset;

  for (const toolsetConfig of toolsetsConfig) {
    try {
      const toolset = await loadToolset(toolsetConfig);
      Object.assign(loadedToolset, toolset);
    } catch (error) {
      console.error(`Failed to load toolset ${toolsetConfig.type}`, error);
    }
  }

  return loadedToolset;
}

async function loadToolset(tool: Config.ToolsetConfig) {
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
      return {};
  }
}
