import OpenAI from 'openai'
import { db } from '../database'
import type { ToolDefinition } from '../mcp/types'

export interface ChatOptions {
  sessionId?: number
  tools?: ToolDefinition[]
  cancellnationToken?: AbortSignal
}

type ChatResponse = AsyncGenerator<
  OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta,
  ChatResponse | undefined,
  unknown
>

export async function* chat(opt: ChatOptions): ChatResponse {
  const client = new OpenAI()

  const session = await (opt.sessionId
    ? db.chatSession.findUnique({ where: { id: opt.sessionId } })
    : db.chatSession.create({
        data: {},
      }))

  if (!session) {
    return
  }

  const messages = await db.chatMessage.findMany({
    where: {
      sessionId: session.id,
    },
  })

  const chatStreamResp = await client.chat.completions.create({
    model: '',
    messages: messages.map((msg) => ({
      role: msg.role as any,
      content: msg.content,
    })),
    tools: opt.tools?.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        strict: t.strict,
        parameters: t.parameters,
      },
    })),
    stream: true,
  })

  opt.cancellnationToken?.addEventListener('abort', () => {
    chatStreamResp.controller.abort(opt.cancellnationToken?.reason)
  })

  if (opt.cancellnationToken?.aborted) {
    chatStreamResp.controller.abort(opt.cancellnationToken.reason)
  }

  for await (const chunk of chatStreamResp) {
    const choice = chunk.choices.at(0)
    if (!choice) {
      return
    }

    if (choice.finish_reason === 'function_call') {
      yield choice.delta

      // todo, create tool call message

      const r =
        choice.delta.tool_calls?.map((tool) =>
          callTool(tool, opt.tools || []),
        ) || []

      const result = await Promise.all(r)

      // todo, create tool call result messages

      return chat(opt)
    }

    yield choice.delta
  }
}

async function callTool(
  tool: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall,
  tools: ToolDefinition[],
) {
  const hit = tools.find((n) => n.name === tool.function?.name)

  return hit?.call(JSON.parse(tool.function?.arguments || '{}'))
}
