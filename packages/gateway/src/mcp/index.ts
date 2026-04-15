import { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/server";
import { StreamableHTTPTransport } from "@hono/mcp";
import type { ToolDefinition } from "./utils";

export function setupMCP(app: Hono) {
  const mcpServer = new McpServer({
    name: "my-bot-mcp-server",
    version: "1.0.0",
  });

  const transport = new StreamableHTTPTransport();

  app.all("/mcp", async (c) => {
    if (!mcpServer.isConnected()) {
      await mcpServer.connect(transport);
    }

    return transport.handleRequest(c);
  });
}

function registerTools(mcpServer: McpServer, tools: ToolDefinition[]) {
  for (const tool of tools) {
    mcpServer.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        outputSchema: tool.output,
      },
      (async (input: any) => {
        try {
          const result = await tool.call(input);

          return {
            content: result.content,
            _meta: result.meta,
          };
        } catch (error) {
          return {
            content: `Error: ${String(error)}`,
            isError: true,
            _meta: {
              error: String(error),
            },
          };
        }
      }) as any,
    );
  }
}
