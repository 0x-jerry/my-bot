import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { loadEnvFile } from "node:process";
import { setupMCP } from "./mcp";
import { setupBot } from "./bot";
import { setupOpenAIChatProxyRoutes } from "./routes/chat";

loadEnvFile();

const app = new Hono();
setupMCP(app);

const bot = setupBot(app);

setupOpenAIChatProxyRoutes(app);

const server = serve(
  {
    fetch: app.fetch,
    port: 8080,
  },
  (info) => {
    console.log(`Server is running at: http://${info.address}:${info.port}`);
  },
);

// Graceful shutdown
process.on("SIGINT", async () => {
  bot.stop();
  server.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await Promise.all([
    bot.stop,
    new Promise((resolve) => server.close(resolve)),
  ]);

  process.exit(0);
});
