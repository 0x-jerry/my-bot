import OpenAI from 'openai'
import type { ChatSessionModel } from '../../generated/prisma/models'
import { ChatRole } from '../constants/chat'
import { db } from '../database'
import { createSessionTools } from '../mcp/tools'
import type { ToolDefinition } from '../mcp/types'

interface ChatMessageTextChunk {
  type: 'text'
  content: string
}

interface ChatMessageToolCallChunk {
  type: 'tool_call'
  name: string
}

interface ChatMessageToolCallResultChunk {
  type: 'tool_call_result'
  result: string
}

type ChatMessageChunk =
  | ChatMessageTextChunk
  | ChatMessageToolCallChunk
  | ChatMessageToolCallResultChunk

export interface ChatOptions {
  sessionId: number
  cancellnationToken?: AbortSignal
}

type ChatResponse = AsyncGenerator<
  ChatMessageChunk,
  ChatResponse | undefined,
  unknown
>

export async function chatWith(
  opt: ChatOptions,
  message?: string,
): Promise<ChatResponse> {
  if (message) {
    const msg: OpenAI.Chat.Completions.ChatCompletionUserMessageParam = {
      role: ChatRole.User,
      content: message,
    }

    await db.chatMessage.create({
      data: {
        role: ChatRole.User,
        sessionId: opt.sessionId,
        message: message,
        rawContent: JSON.stringify(msg),
      },
    })
  }

  return continueChat(opt)
}

async function* continueChat(opt: ChatOptions): ChatResponse {
  const session = await db.chatSession.findUnique({
    where: {
      id: opt.sessionId,
    },
    include: {
      agentConfig: {
        include: {
          provider: true,
        },
      },
    },
  })

  if (!session?.agentConfig?.provider?.url) {
    return
  }

  const client = new OpenAI({
    baseURL: session.agentConfig.provider.url,
    apiKey: session.agentConfig.provider.apiKey,
    dangerouslyAllowBrowser: true,
  })

  const messages = await db.chatMessage.findMany({
    where: {
      sessionId: session.id,
    },
  })

  const tools = createSessionTools(session.id)

  const chatStreamResp = await client.chat.completions.create({
    model: session.agentConfig.provider.model,
    messages: messages.map((msg) => JSON.parse(msg.rawContent)),
    tools: tools.map((tool) => {
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          strict: tool.strict,
          parameters: tool.parameters,
        },
      }
    }),
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

    if (choice.finish_reason === 'tool_calls') {
      const toolCalls = choice.delta.tool_calls || []

      if (!toolCalls.length) {
        return
      }

      const msg: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
        role: ChatRole.Assistant,
        tool_calls:
          toolCalls as OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
      }

      await db.chatMessage.create({
        data: {
          sessionId: session.id,
          role: ChatRole.Assistant,
          rawContent: JSON.stringify(msg),
          message: '',
        },
      })

      for (const tool of toolCalls) {
        yield {
          type: 'tool_call',
          name: tool.function!.name!,
        }

        const result = await callTool(tool, tools)

        const msg: OpenAI.Chat.Completions.ChatCompletionToolMessageParam = {
          role: ChatRole.Tool,
          tool_call_id: chunk.id,
          content: result,
        }

        await db.chatMessage.create({
          data: {
            sessionId: session.id,
            role: ChatRole.Tool,
            message: result,
            rawContent: JSON.stringify(msg),
          },
        })

        yield {
          type: 'tool_call_result',
          result: result,
        }
      }

      return continueChat(opt)
    }

    yield {
      type: 'text',
      content: choice.delta.content!,
    }
  }
}

export async function create(agentConfigId: number): Promise<ChatSessionModel> {
  const result = await db.chatSession.create({
    data: {
      name: 'Untitled',
      agentConfigId: agentConfigId,
    },
  })

  return result
}

async function callTool(
  tool: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall,
  tools: ToolDefinition[],
) {
  const hit = tools.find((n) => n.name === tool.function?.name)

  try {
    const result = await hit?.call(JSON.parse(tool.function?.arguments || '{}'))

    return result || ''
  } catch (error) {
    return String(error)
  }
}
