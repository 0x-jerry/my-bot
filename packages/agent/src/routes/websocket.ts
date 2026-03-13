import type { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { gv } from "../global";

export function setupWebsocketRoute(app: Hono) {
  app.get(
    "/",
    upgradeWebSocket((c) => {
      const sessionId = c.req.param("id");

      return {
        onClose() {
          if (!sessionId) {
            return;
          }

          gv.sessionStateManager.remove(sessionId);
        },
        async onOpen(_evt, ws) {
          if (!sessionId) {
            return;
          }

          gv.sessionStateManager.upsert({
            id: sessionId,
            ws,
          });
        },
      };
    }),
  );
}
