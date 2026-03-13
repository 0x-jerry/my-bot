import type { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { gv } from "../global";

export function setupWebsocketRoute(app: Hono) {
  app.get(
    "/:platform",
    upgradeWebSocket((c) => {
      const platform = c.req.param("platform");

      return {
        onClose(_evt) {
          if (!platform) {
            return;
          }

          gv.connectedWebsockets.delete(platform);
        },
        async onOpen(_evt, ws) {
          if (platform) {
            gv.connectedWebsockets.set(platform, ws);
          }
        },
      };
    }),
  );
}
