import { Hono } from "hono";
import { gv } from "../../global";
import type { ModelMessage } from "ai";
import { upgradeWebSocket } from "hono/bun";
import { chatWithSession } from "../../sessions/chat";

export function setupSessionsRoutes(app: Hono) {
  /**
   * Get all sessions
   */
  app.get("/", async (c) => {
    const sessions = await gv.db.session.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json(sessions);
  });

  /**
   * Create a new session
   */
  app.post("/", async (c) => {
    const body = await c.req.json<{ profile?: string }>();
    const profile =
      body.profile || Object.keys(gv.config.agents || {}).at(0) || "";

    if (!gv.config.agents?.[profile]) {
      return c.json({ error: "Invalid agent profile" }, 400);
    }

    const session = await gv.db.session.create({
      data: {
        agentProfile: profile,
      },
    });

    return c.json(session);
  });

  /**
   * Get a session by ID
   */
  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const session = await gv.db.session.findUnique({
      where: { id },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json(session);
  });

  /**
   * Get all messages for a session by ID
   */
  app.get("/:id/messages", async (c) => {
    const id = c.req.param("id");

    const messages = await gv.db.message.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "asc" },
    });

    return c.json(messages);
  });

  /**
   * Delete a session by ID
   */
  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    await gv.db.session.delete({
      where: { id },
    });
    return c.json({ success: true });
  });

  /**
   * Chat with a session by ID
   */
  app.post("/:id/chat", async (c) => {
    const sessionId = c.req.param("id");

    const session = await gv.db.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const userMessages = await c.req.json<ModelMessage[]>();

    const streamResult = await chatWithSession(sessionId, userMessages, {
      saveMessages: true,
    });

    const resp = streamResult.toUIMessageStreamResponse();

    return resp;
  });

  app.get(
    "/:id/ws",
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
