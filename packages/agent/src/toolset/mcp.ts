import type { LoadedToolset, ToolSet } from "./types";
import { createMCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { gv } from "../global";

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

  return {
    toolset: await client.tools(),
    dispose: async () => {
      await client.close();
    },
  };
}
