import z from 'zod'
import { sessionService } from '../services'
import { checkPathPermission } from './_permission'
import { defineTool } from './_utils'
import type { ToolDefinition } from './types'

export enum BashToolPermission {
  Run = 'bash:run',
}

export function createBashTools(sessionId: number): ToolDefinition[] {
  const workspaceRoot = sessionService.getWorksapceRoot(sessionId)

  return [
    defineTool({
      name: 'shell',
      permission: BashToolPermission.Run,
      parameters: z.toJSONSchema(
        z.object({
          cwd: z.string().optional(),
          script: z.string(),
        }),
      ),
      async call(args) {
        const cwd = checkPathPermission(
          args.cwd || workspaceRoot,
          workspaceRoot,
        )

        //todo

        return ''
      },
    }),
  ]
}
