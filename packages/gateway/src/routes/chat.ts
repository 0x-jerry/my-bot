import { Hono } from "hono";
import { proxy } from "hono/proxy";
import { getDatabaseClient } from "../database";

export function setupOpenAIChatProxyRoutes(app: Hono) {
  app.all("/provider/:name/:path{.+}", async (c) => {
    const name = c.req.param("name");
    const path = c.req.param("path");

    const db = getDatabaseClient();

    const provider = await db.providerConfig.findUnique({
      where: {
        name,
      },
    });

    if (!provider) {
      return c.json({ error: `Provider ${name} not found` }, 404);
    }

    const destUrl = new URL(path, provider.baseURL);
    const headers = new Headers(c.req.raw.headers);

    switch (provider.type) {
      case "openai-compatible":
        headers.set("Authorization", `Bearer ${provider.apiKey}`);
        break;

      default:
        return c.json({ error: `Provider type ${provider.type} not support` }, 400);
    }

    return proxy(destUrl, {
      ...c.req,
      headers: headers,
    });
  });
}
