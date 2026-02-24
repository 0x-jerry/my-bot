import { createMemoryTools } from './memory'
import type { ToolDefinition } from './types'

export function createSessionTools(sessionId: number): ToolDefinition[] {
  return [
    //
    ...createMemoryTools(sessionId),
  ]
}
