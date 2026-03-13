import { Hono } from "hono";
import { gv } from "../../global";
import type { ModelMessage } from "ai";
import { saveModelMessages } from "../../database/session";
import type { Config } from "../../config/types";
import dayjs from "dayjs";
import type { MessageModel } from "../../generated/prisma/models";

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

    const agent = await gv.agentManager.getOrCreate(session.agentProfile);

    const history = await gv.db.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    const messages: ModelMessage[] = history.map((message) => {
      return JSON.parse(message.raw);
    });

    const extraMessages = createExtraInformation(agent.config, history);

    if (extraMessages.length) {
      messages.push(...extraMessages);
      await saveModelMessages(extraMessages, sessionId);
    }

    if (userMessages.length) {
      messages.push(...userMessages);

      await saveModelMessages(userMessages, sessionId);
    }

    const streamResult = await agent.runChatLoop(messages, sessionId, {
      onFinish: async (output) => {
        await saveModelMessages(output.response.messages, sessionId);
      },
    });

    const resp = streamResult.toUIMessageStreamResponse();

    return resp;
  });
}

function createExtraInformation(
  config: Config.AgentConfig,
  history: MessageModel[],
): ModelMessage[] {
  const msgs: ModelMessage[] = [];

  if (config.context?.addDate) {
    const now = dayjs();

    const lastMessageDate = history.at(-1)?.createdAt;

    if (!lastMessageDate) {
      msgs.push({
        role: "system",
        content: `Current datetime: ${now.toString()}`,
      });
    } else {
      // Add datetime every 1 hours

      if (dayjs(lastMessageDate).add(1, "hour").isBefore(now)) {
        msgs.push({
          role: "system",
          content: `Current datetime: ${now.toString()}`,
        });
      }
    }
  }

  return msgs;
}
