import { type Arrayable, ensureArray } from "@0x-jerry/utils";
import type { LanguageModelUsage, ModelMessage } from "ai";
import type {
  MessageCreateInput,
  SessionUsageCreateInput,
} from "../generated/prisma/models";
import { gv } from "../global";

export async function saveModelMessages(
  sessionId: string,
  messages: Arrayable<ModelMessage>,
) {
  const dbMessages = ensureArray(messages).map((message) => {
    const msg: MessageCreateInput = {
      sessionId,
      role: message.role,
      content: typeof message.content === "string" ? message.content : "",
      raw: JSON.stringify(message),
    };

    return msg;
  });

  await gv.db.message.createMany({
    data: dbMessages,
  });
}

export async function saveSessionUsage(
  sessionId: string,
  usage: LanguageModelUsage,
) {
  const data: SessionUsageCreateInput = {
    sessionId,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
  };

  await gv.db.sessionUsage.create({
    data,
  });
}
