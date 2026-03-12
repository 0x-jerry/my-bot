import { type Arrayable, ensureArray } from "@0x-jerry/utils";
import type { ModelMessage } from "ai";
import type { MessageCreateInput } from "../generated/prisma/models";
import { gv } from "../global";

export async function saveModelMessages(
  messages: Arrayable<ModelMessage>,
  sessionId: string,
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
