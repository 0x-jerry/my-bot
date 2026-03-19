import type { LoadedToolset, ToolSet } from "./types";
import { createMCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { gv } from "../global";
import type { Tool } from "ai";

export async function createMCPToolset(
  config: ToolSet.Mcp,
): Promise<LoadedToolset> {
  const mcpConfig: ToolSet.McpConfig = resolveMcpConfig(config);

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

  const filteredToolset = filterToolset(toolset, mcpConfig.filterTools);

  return {
    toolset: filteredToolset,
    dispose: async () => {
      await client.close();
    },
  };
}

function resolveMcpConfig(config: ToolSet.Mcp) {
  if (!config.name) {
    return config;
  }

  const topLevelConf = gv.config.mcps?.[config.name];

  if (!topLevelConf) {
    return config;
  }

  const mcpConfig = structuredClone(topLevelConf);

  mcpConfig.filterTools = [
    ...new Set([
      ...(topLevelConf.filterTools || []),
      ...(config.filterTools || []),
    ]),
  ];

  return mcpConfig;
}

function filterToolset(toolset: Record<string, Tool>, includes?: string[]) {
  if (!includes?.length) {
    return toolset;
  }

  const tools = includes.map((key) => [key, toolset[key]]);

  return Object.fromEntries(tools);
}
