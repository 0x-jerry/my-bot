import { Tool } from "ai";
import { LoadedToolset, ToolSet } from "./types";
import { createMCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export async function createMCPToolset(
  config: ToolSet.Mcp,
): Promise<LoadedToolset> {
  const transport = config.command
    ? new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      })
    : config.remoteUrl
      ? {
          type: config.remoteType ?? "http",
          url: config.remoteUrl,
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
