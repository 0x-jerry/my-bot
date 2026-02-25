import z from 'zod'
import { sessionService } from '../services'
import { defineTool } from './_utils'
import type { ToolDefinition } from './types'

export function createBashTools(sessionId: number): ToolDefinition[] {
  const workspaceRoot = sessionService.getWorksapceRoot(sessionId)

  return [
    defineTool({
      name: 'search-skill',
      parameters: z.toJSONSchema(
        z.object({
          query: z.string(),
        }),
      ),
      async call(args) {
        //todo

        return ''
      },
    }),
    defineTool({
      name: 'download-skill',
      parameters: z.toJSONSchema(
        z.object({
          skillId: z.string(),
        }),
      ),
      async call(args) {
        //todo

        return ''
      },
    }),
  ]
}
