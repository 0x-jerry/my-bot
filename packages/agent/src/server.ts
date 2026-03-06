import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { setupRoutes } from "./routes";

export function setupServer() {
  const app = new Hono();

  setupRoutes(app);

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
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await Promise.all([new Promise((resolve) => server.close(resolve))]);

    process.exit(0);
  });

  return {
    app,
    server,
  };
}
