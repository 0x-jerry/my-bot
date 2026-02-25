import type { Awaitable } from '@0x-jerry/utils'

export interface IAgent {
  /**
   * Allow permissions
   */
  permissions: string[]

  execute(message: string): Awaitable<string | void>
}
