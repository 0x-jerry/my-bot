import type { ModelMessage } from "ai";
import { saveModelMessages, saveSessionUsage } from "../database/session";
import { gv } from "../global";

export interface ChatWithSessionOptions {}

export async function chatWithSession(
  sessionId: string,
  inputMessages: ModelMessage[],
  _opt?: ChatWithSessionOptions,
) {
  const session = await gv.db.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const agent = await gv.agentManager.getOrCreate(session.agentProfile);

  const history = await gv.db.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  const messages: ModelMessage[] = history.map((message) => {
    return JSON.parse(message.raw);
  });

  if (inputMessages.length) {
    messages.push(...inputMessages);

    await saveModelMessages(sessionId, inputMessages);
  }

  const streamResult = await agent.runChatLoop(messages, sessionId, {
    onFinish: async (output) => {
      await Promise.all([
        saveModelMessages(sessionId, output.response.messages),
        saveSessionUsage(sessionId, output.usage),
      ]);
    },
  });

  return streamResult;
}
