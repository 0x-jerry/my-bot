import type { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { gv } from "../global";

export function setupWebsocketRoute(app: Hono) {
  app.get(
    "/",
    upgradeWebSocket((c) => {
      return {
        onClose(_evt, ws) {
          gv.connectedWebsockets.delete(ws);
        },
        async onOpen(_evt, ws) {
          gv.connectedWebsockets.add(ws);
        },
      };
    }),
  );
}
