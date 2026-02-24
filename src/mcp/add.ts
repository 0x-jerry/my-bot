import type { ToolDefinition } from './types'

export const AddTool: ToolDefinition<{ nums: number[] }> = {
  name: 'Add',
  call(args) {
    return args.nums.reduce((pre, cur) => pre + cur, 0)
  },
}
