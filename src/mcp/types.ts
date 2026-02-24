export interface ToolDefinition<T extends Record<string, unknown> = any> {
  name: string
  description?: string
  parameters?: Record<string, unknown>
  strict?: boolean | null
  call: (args: T) => void
}
