import type { Awaitable } from '@0x-jerry/utils'
import type z from 'zod'
import type { ToolDefinition } from './types'

export interface ZodToolDefinition<T = unknown> extends ToolDefinition {
  parameters?: z.core.ZodStandardJSONSchemaPayload<T>
  call: (args: z.infer<T>) => Awaitable<string | void>
}

export function defineTool<T>(opt: ZodToolDefinition<T>): ToolDefinition {
  return opt
}

export function filterToolsByPermissions(
  tools: ToolDefinition[],
  permissions: string[],
): ToolDefinition[] {
  return tools.filter((_tool) => {
    const tool = _tool as ZodToolDefinition
    if (tool.permission == null) {
      return true
    }

    return permissions.includes(tool.permission)
  })
}
