import type { LoadedToolset, ToolSet } from "./types";
import { createMCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { gv } from "../global";
import type { Tool } from "ai";

export async function createMCPToolset(
  config: ToolSet.Mcp,
): Promise<LoadedToolset> {
  let mcpConfig: ToolSet.McpConfig = config;

  if (config.name) {
    const topLevelConf = gv.config.mcps?.[config.name];
    if (topLevelConf) {
      mcpConfig = topLevelConf;
    }
  }

  const transport = mcpConfig.command
    ? new StdioClientTransport({
        command: mcpConfig.command,
        args: mcpConfig.args,
        env: mcpConfig.env,
      })
    : mcpConfig.remoteUrl
      ? {
          type: mcpConfig.remoteType ?? "http",
          url: mcpConfig.remoteUrl,
        }
      : undefined;

  if (!transport) {
    return {
      toolset: {},
    };
  }

  const client = await createMCPClient({
    transport,
  });

  const toolset = await client.tools();

  const filteredToolset = filterToolset(toolset, config.filterTools);

  return {
    toolset: filteredToolset,
    dispose: async () => {
      await client.close();
    },
  };
}

function filterToolset(toolset: Record<string, Tool>, includes?: string[]) {
  if (!includes?.length) {
    return toolset;
  }

  const tools = includes.map((key) => [key, toolset[key]]);

  return Object.fromEntries(tools);
}
