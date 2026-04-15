import type { LanguageModelUsage, ModelMessage, StreamTextResult } from "ai";
import { saveModelMessages, saveSessionUsage } from "../database/session";
import { gv } from "../global";

export interface ChatWithSessionOptions {
  abortSignal?: AbortSignal;
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

    await saveModelMessages(sessionId, inputMessages);
  }

  const streamResult = await agent.runChatLoop(messages, sessionId, {
    abortSignal: opt?.abortSignal,
  });

  saveChatStreamOutput(sessionId, streamResult);
  return streamResult;
}

async function saveChatStreamOutput(sessionId: string, streamResult: StreamTextResult<any, any>) {
  const [response, usage] = await Promise.all([streamResult.response, streamResult.totalUsage]);

  await Promise.all([
    saveModelMessages(sessionId, response.messages),
    saveSessionUsage(sessionId, usage),
  ]);
}
