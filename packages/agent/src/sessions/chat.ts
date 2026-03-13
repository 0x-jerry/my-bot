import type { ModelMessage } from "ai";
import { saveModelMessages } from "../database/session";
import { gv } from "../global";
import dayjs from "dayjs";
import type { Config } from "../config/types";
import type { MessageModel } from "../generated/prisma/models";

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

  const extraMessages = createExtraInformation(agent.config, history);

  if (extraMessages.length) {
    messages.push(...extraMessages);

    if (opt?.saveMessages) {
      await saveModelMessages(extraMessages, sessionId);
    }
  }

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
