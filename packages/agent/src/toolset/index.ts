import { ToolSet } from "ai";
import { Config } from "../config/types";

/**
 * Resolve toolset from config.
 */
export async function resolveToolset(
  toolset?: Config.ToolsetConfig[],
): Promise<ToolSet> {
  if (!toolset?.length) return {};

  return {};
}
