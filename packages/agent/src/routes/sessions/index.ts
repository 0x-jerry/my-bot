import { Hono } from "hono";
import { gv } from "../../global";
import type { ModelMessage } from "ai";
import { saveModelMessages } from "../../database/session";

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
    const profile = body.profile || Object.keys(gv.config.agents || {}).at(0) || '';

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

    const body = await c.req.json<{ message?: string }>();

    const history = await gv.db.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    const messages: ModelMessage[] = history.map((message) => {
      return JSON.parse(message.raw);
    });

    if (body.message) {
      const userMessage: ModelMessage = { role: "user", content: body.message };

      messages.push(userMessage);

      await saveModelMessages(userMessage, sessionId);
    }

    const agent = await gv.agentManager.getOrCreate(session.agentProfile);
    const output = await agent.runChatLoop(messages);

    await saveModelMessages(output.response.messages, sessionId);

    return c.json({
      text: output.text,
      reasoningText: output.reasoningText,
    });
  });
}
