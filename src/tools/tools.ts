import { filterToolsByPermissions } from './_utils'
import { createFileTools } from './file'
import { createMemoryTools } from './memory'
import type { ToolDefinition } from './types'

export function createSessionTools(
  sessionId: number,
  permissions: string[],
): ToolDefinition[] {
  return filterToolsByPermissions(
    [
      //
      ...createMemoryTools(sessionId),
      ...createFileTools(sessionId),
    ],
    permissions,
  )
}
