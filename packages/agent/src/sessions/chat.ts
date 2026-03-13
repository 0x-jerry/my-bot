import type { ModelMessage } from "ai";
import { saveModelMessages } from "../database/session";
import { gv } from "../global";

export interface ChatWithSessionOptions {
  /**
   * Whether to save the input and output messages to the database.
   */
  saveMessages: boolean;
}

export async function chatWithSession(
  sessionId: string,
  inputMessages: ModelMessage[],
  opt?: ChatWithSessionOptions,
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

    if (opt?.saveMessages) {
      await saveModelMessages(inputMessages, sessionId);
    }
  }

  const streamResult = await agent.runChatLoop(messages, sessionId, {
    onFinish: async (output) => {
      if (opt?.saveMessages) {
        await saveModelMessages(output.response.messages, sessionId);
      }
    },
  });

  return streamResult;
}
