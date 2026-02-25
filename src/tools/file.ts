import { glob, readdir, readFile, writeFile } from 'node:fs/promises'
import z from 'zod'
import { sessionService } from '../services'
import { checkPathPermission } from './_permission'
import { defineTool } from './_utils'
import type { ToolDefinition } from './types'

export enum FileToolPermission {
  Write = 'file:write',
}

export function createFileTools(sessionId: number): ToolDefinition[] {
  const workspaceRoot = sessionService.getWorksapceRoot(sessionId)

  return [
    defineTool({
      name: 'read-file',
      parameters: z.toJSONSchema(
        z.object({
          path: z.string(),
        }),
      ),
      async call(args) {
        const finalPath = checkPathPermission(args.path, workspaceRoot)

        const content = await readFile(finalPath, 'utf8')

        return content
      },
    }),
    defineTool({
      name: 'scan-files',
      description: 'Scan files in current workspace',
      parameters: z.toJSONSchema(
        z.object({
          globPattern: z.string(),
        }),
      ),
      async call(args) {
        const content = await Array.fromAsync(glob(args.globPattern))

        return content.join('\n')
      },
    }),
    defineTool({
      name: 'read-dir',
      parameters: z.toJSONSchema(
        z.object({
          dirPath: z.string(),
        }),
      ),
      async call(args) {
        const finalPath = checkPathPermission(args.dirPath, workspaceRoot)

        const content = await readdir(finalPath)

        return content.join('\n')
      },
    }),
    defineTool({
      name: 'write-file',
      permission: FileToolPermission.Write,
      parameters: z.toJSONSchema(
        z.object({
          path: z.string(),
          content: z.string(),
        }),
      ),
      async call(args) {
        const finalPath = checkPathPermission(args.path, workspaceRoot)

        await writeFile(finalPath, args.content)

        return 'Done'
      },
    }),
  ]
}
