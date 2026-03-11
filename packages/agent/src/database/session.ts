import { Arrayable, ensureArray } from "@0x-jerry/utils";
import { ModelMessage } from "ai";
import { MessageCreateInput } from "../generated/prisma/models";
import { gv } from "../global";

export async function saveModelMessages(
  messages: Arrayable<ModelMessage>,
  sessionId: string,
) {
  const dbMesasges = ensureArray(messages).map((message) => {
    const msg: MessageCreateInput = {
      sessionId,
      role: message.role,
      content: typeof message.content === "string" ? message.content : "",
      raw: JSON.stringify(message),
    };

    return msg;
  });

  await gv.db.message.createMany({
    data: dbMesasges,
  });
}
