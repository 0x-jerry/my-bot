import z from 'zod'
import { memoryService } from '../services'
import { defineTool } from './_utils'
import type { ToolDefinition } from './types'

export function createMemoryTools(sessionId: number): ToolDefinition[] {
  return [
    defineTool({
      name: 'add-memory',
      parameters: z.toJSONSchema(
        z.object({
          content: z.string(),
        }),
      ),
      async call(args) {
        await memoryService.create(sessionId, args.content)

        return 'Done'
      },
    }),
    defineTool({
      name: 'search-memory',
      parameters: z.toJSONSchema(
        z.object({
          keywords: z.array(z.string()),
        }),
      ),
      async call(args) {
        const memories = await memoryService.search(args.keywords)

        return memories.map((r) => `${r.createdAt}: ${r.content}`).join('\n\n')
      },
    }),
  ]
}
