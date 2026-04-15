import type { ContentBlock, SessionUpdate } from "@agentclientprotocol/sdk";
import type { FilePart, ImagePart, ModelMessage, TextPart, TextStreamPart, UserContent } from "ai";

type UserContentPart = TextPart | ImagePart | FilePart;

export function contentBlocksToAiUserContent(blocks: ContentBlock[]): UserContent {
  const parts: UserContentPart[] = blocks.map((block) => {
    switch (block.type) {
      case "text":
        return { type: "text", text: block.text } satisfies TextPart;
      case "resource":
        return {
          type: "file",
          data: new URL(block.resource.uri),
          mediaType: block.resource.mimeType || "plain/text",
        } satisfies FilePart;
      case "resource_link":
        return {
          type: "file",
          data: new URL(block.uri),
          mediaType: block.mimeType || "plain/text",
        } satisfies FilePart;
      case "image":
        return {
          type: "image",
          image: block.uri ? new URL(block.uri) : block.data,
          mediaType: block.mimeType,
        } satisfies ImagePart;
      case "audio":
        return {
          type: "file",
          data: block.data,
          mediaType: block.mimeType,
        } satisfies FilePart;
      default:
        return { type: "text", text: "" } satisfies TextPart;
    }
  });

  return parts;
}

export function* aiContentToSessionUpdates(message: ModelMessage): Generator<SessionUpdate> {
  if (message.role === "system") {
    return;
  }

  const isUser = message.role === "user";

  if (typeof message.content === "string") {
    yield {
      sessionUpdate: isUser ? "user_message_chunk" : "agent_message_chunk",
      content: {
        type: "text",
        text: message.content,
      },
    } satisfies SessionUpdate;

    return;
  }

  for (const part of message.content) {
    switch (part.type) {
      case "text":
        yield {
          sessionUpdate: isUser ? "user_message_chunk" : "agent_message_chunk",
          content: {
            type: "text",
            text: part.text,
          },
        } satisfies SessionUpdate;

        break;

      case "image":
        yield {
          sessionUpdate: isUser ? "user_message_chunk" : "agent_message_chunk",
          content: {
            type: "image",
            data: part.image.toString(),
            mimeType: part.mediaType || "image",
            uri: part.image instanceof URL ? part.image.toString() : undefined,
          },
        } satisfies SessionUpdate;
        break;
      case "file":
        if (part.data instanceof URL) {
          yield {
            sessionUpdate: isUser ? "user_message_chunk" : "agent_message_chunk",
            content: {
              type: "resource_link",
              uri: part.data.toString(),
              name: part.filename || "unknown",
            },
          } satisfies SessionUpdate;
        } else {
          console.warn(`not support`);
        }

        break;
      case "reasoning":
        yield {
          sessionUpdate: "agent_thought_chunk",
          content: {
            type: "text",
            text: part.text,
          },
        } satisfies SessionUpdate;
        break;

      case "tool-call":
        yield {
          sessionUpdate: "tool_call",
          title: part.toolName,
          toolCallId: part.toolCallId,
          rawInput: part.input,
        } satisfies SessionUpdate;
        break;

      case "tool-result":
        yield {
          sessionUpdate: "tool_call_update",
          toolCallId: part.toolCallId,
          rawOutput: part.output,
        } satisfies SessionUpdate;
        break;

      default:
        break;
    }
  }
}

export function streamPartToSessionUpdate(part: TextStreamPart<any>): SessionUpdate | undefined {
  switch (part.type) {
    case "text-delta":
      return {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: part.text },
      };
    case "reasoning-delta":
      return {
        sessionUpdate: "agent_thought_chunk",
        content: { type: "text", text: part.text },
      };
    case "tool-call":
      return {
        sessionUpdate: "tool_call",
        toolCallId: part.toolCallId,
        title: part.toolName,
        kind: "execute",
        status: "in_progress",
        rawInput: part.input,
      };
    case "tool-result":
      return {
        sessionUpdate: "tool_call_update",
        toolCallId: part.toolCallId,
        status: "completed",
        rawInput: part.input,
        rawOutput: part.output,
        content: [
          {
            type: "content",
            content: {
              type: "text",
              text: typeof part.output === "string" ? part.output : JSON.stringify(part.output),
            },
          },
        ],
      };
    case "tool-error":
    case "tool-output-denied":
      return {
        sessionUpdate: "tool_call_update",
        toolCallId: part.toolCallId,
        status: "failed",
        rawOutput: "error" in part ? part.error : part,
      };
    default:
      return undefined;
  }
}
