import z from 'zod'
import { memoryService } from '../services'
import type { ToolDefinition } from './types'

export function createMemoryTools(sessionId: number): ToolDefinition[] {
  const add: ToolDefinition<{ content: string }> = {
    name: 'addMemory',
    parameters: z.toJSONSchema(
      z.object({
        content: z.string(),
      }),
    ),
    async call(args) {
      await memoryService.create(sessionId, args.content)

      return 'Done'
    },
  }

  const search: ToolDefinition<{ keywords: string[] }> = {
    name: 'searchMemory',
    parameters: z.toJSONSchema(
      z.object({
        keywords: z.array(z.string()),
      }),
    ),
    async call(args) {
      const memories = await memoryService.search(args.keywords)

      return memories.map((r) => `${r.createdAt}: ${r.content}`).join('\n\n')
    },
  }

  return [add, search]
}
