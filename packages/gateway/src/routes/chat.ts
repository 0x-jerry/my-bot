import { Hono } from "hono";
import { proxy } from "hono/proxy";

export function setupOpenAIChatProxyRoutes(app: Hono) {
  const prefix = "/openai/v1";
  app.basePath(prefix).all("*", (c) => {
    const url = new URL(c.req.url);
    const config = {
      endpoint: process.env.OPENAI_API_ENDPOINT!,
      apikey: process.env.OPENAI_API_KEY!,
    };

    const target = new URL(config.endpoint);

    // Combine the target's base URL (origin + pathname) with the request's pathname and search.
    // We remove the trailing slash from the target pathname if it exists to avoid double slashes.
    const targetBase = target.origin + target.pathname.replace(/\/$/, "");
    const pathname = url.pathname.replace(prefix, "");
    const destUrl = targetBase + pathname + url.search;

    // Override the Authorization header with the configured API key
    const headers = new Headers(c.req.raw.headers);
    if (config.apikey) {
      headers.set("Authorization", `Bearer ${config.apikey}`);
    }

    return proxy(destUrl, { headers });
  });
}
