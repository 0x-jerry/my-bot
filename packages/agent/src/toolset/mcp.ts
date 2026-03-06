import { Tool } from "ai";
import { ToolSet } from "./types";
import { createMCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export async function createMCPToolset(
  config: ToolSet.Mcp,
): Promise<Record<string, Tool>> {
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
    return {};
  }

  const client = await createMCPClient({
    transport,
  });

  return client.tools();
}
