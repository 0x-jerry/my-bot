import type { Config } from "../config/types";
import { createMemoryToolset } from "./memory";
import { createMCPToolset } from "./mcp";
import { createShellToolset } from "./shell";
import { createSkillToolset } from "./skill";
import type { LoadedToolset } from "./types";
import { createInvokeToolset } from "./invoke";
import { createEnvToolset } from "./env";
import { createTodoToolset } from "./todo";

/**
 * Resolve toolset from config.
 */
export async function loadStaticToolsets(
  toolsetsConfig?: Config.ToolsetConfig[],
): Promise<LoadedToolset[]> {
  const loadedToolset: LoadedToolset[] = [];

  if (!toolsetsConfig?.length) return loadedToolset;

  for (const toolsetConfig of toolsetsConfig) {
    try {
      const toolset = await loadSaticToolset(toolsetConfig);
      if (!toolset) continue;

      loadedToolset.push(toolset);
    } catch (error) {
      console.error("Failed to load toolset", toolsetConfig, error);
    }
  }

  return loadedToolset;
}

export async function loadDynamicToolsets(
  sessionId: string,
  toolsetsConfig?: Config.ToolsetConfig[],
): Promise<LoadedToolset[]> {
  const loadedToolset: LoadedToolset[] = [];

  if (!toolsetsConfig?.length) return loadedToolset;

  for (const toolsetConfig of toolsetsConfig) {
    try {
      const toolset = await loadDynamictoolset(toolsetConfig, sessionId);
      if (!toolset) continue;

      loadedToolset.push(toolset);
    } catch (error) {
      console.error("Failed to load toolset", toolsetConfig, error);
    }
  }

  return loadedToolset;
}

async function loadDynamictoolset(
  tool: Config.ToolsetConfig,
  sessionId: string,
): Promise<LoadedToolset | null> {
  switch (tool.type) {
    case "invoke":
      return await createInvokeToolset(tool, sessionId);
    case "todo":
      return await createTodoToolset(tool, sessionId);
    default:
      return null;
  }
}

async function loadSaticToolset(
  tool: Config.ToolsetConfig,
): Promise<LoadedToolset | null> {
  switch (tool.type) {
    case "memory":
      return await createMemoryToolset(tool);
    case "mcp":
      return await createMCPToolset(tool);
    case "shell":
      return await createShellToolset(tool);
    case "skill":
      return await createSkillToolset(tool);
    case "env":
      return await createEnvToolset(tool);
    default:
      return null;
  }
}
