import path from 'node:path'
import OpenAI from 'openai'
import type {
  ChatMessageModel,
  ChatSessionModel,
} from '../../generated/prisma/models'
import { appGlobalConfig } from '../configs/global'
import { ChatRole } from '../constants/chat'
import { db } from '../database'
import type { ToolDefinition } from '../tools/types'
import { exec } from '@0x-jerry/utils/node'

interface ChatMessageTextChunk {
  type: 'text'
  content: string
}

interface ChatMessageToolCallChunk {
  type: 'tool_call'
  name: string
  arguments: string
}

interface ChatMessageToolCallResultChunk {
  type: 'tool_call_result'
  result: string
}

export type ChatMessageChunk =
  | ChatMessageTextChunk
  | ChatMessageToolCallChunk
  | ChatMessageToolCallResultChunk

export interface ChatOptions {
  sessionId: number
  tools?: ToolDefinition[]
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
    await createChatMessage(opt.sessionId, {
      role: ChatRole.User,
      content: message,
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

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = (
    opt.tools || []
  ).map((tool) => {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        strict: tool.strict,
        parameters: tool.parameters,
      },
    }
  })

  const chatStreamResp = await client.chat.completions.create({
    model: session.agentConfig.provider.model,
    messages: messages.map((msg) => JSON.parse(msg.rawContent)),
    tools: tools,
    stream: true,
  })

  opt.cancellnationToken?.addEventListener('abort', () => {
    chatStreamResp.controller.abort(opt.cancellnationToken?.reason)
  })

  if (opt.cancellnationToken?.aborted) {
    chatStreamResp.controller.abort(opt.cancellnationToken.reason)
  }

  let currentChatMessage: ChatMessageModel | undefined

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

      await createChatMessage(opt.sessionId, {
        role: ChatRole.Assistant,
        tool_calls:
          toolCalls as OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
      })

      for (const tool of toolCalls) {
        yield {
          type: 'tool_call',
          name: tool.function!.name!,
          arguments: tool.function!.arguments!,
        }

        const result = await callTool(tool, opt.tools || [])

        await createChatMessage(opt.sessionId, {
          role: ChatRole.Tool,
          tool_call_id: chunk.id,
          content: result,
        })

        yield {
          type: 'tool_call_result',
          result: result,
        }
      }

      return continueChat(opt)
    }

    if (!currentChatMessage) {
      currentChatMessage = await createChatMessage(opt.sessionId, {
        role: ChatRole.Assistant,
        content: choice.delta.content,
      })
    } else {
      const newMessage =
        currentChatMessage.message + (choice.delta.content || '')

      currentChatMessage = await db.chatMessage.update({
        where: {
          id: currentChatMessage.id,
        },
        data: {
          message: newMessage,
          rawContent: JSON.stringify({
            role: ChatRole.Assistant,
            content: newMessage,
          }),
        },
      })
    }

    yield {
      type: 'text',
      content: choice.delta.content!,
    }
  }
}

async function createChatMessage(
  sessionId: number,
  msg: OpenAI.Chat.Completions.ChatCompletionMessageParam,
) {
  let message = ''

  if (msg.content) {
    if (Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === 'text') {
          message += c.text
        }
      }
    } else {
      message = msg.content
    }
  }

  return await db.chatMessage.create({
    data: {
      role: ChatRole.User,
      sessionId,
      message,
      rawContent: JSON.stringify(msg),
    },
  })
}

export async function create(agentConfigId: number): Promise<ChatSessionModel> {
  const result = await db.chatSession.create({
    data: {
      name: 'Untitled',
      agentConfigId: agentConfigId,
    },
  })

  const pwd = process.cwd()
  const root = getWorkspaceRoot(result.id)
  process.chdir(root)

  // Install find-skills skill in workspace
  // https://skills.sh/vercel-labs/skills/find-skills
  const r = exec('npx skills add https://github.com/vercel-labs/skills --skill find-skills', { collectOutput: true })

  process.chdir(pwd)
  await r

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

export function getWorkspaceRoot(sessionId: number): string {
  return path.join(appGlobalConfig.session.workspaceRoot, `${sessionId}`)
}
