import type { Awaitable } from "@0x-jerry/utils";
import z from "zod";

export interface ToolDefinition<T extends Record<string, unknown> = any> {
  name: string;
  title?: string;
  description?: string;
  permission?: string;
  input?: any;
  output?: any;
  strict?: boolean | null;
  call: (args: T) => Awaitable<ToolResponse>;
}

export interface ToolResponse {
  content: string;
  meta?: Record<string, unknown>;
}

export interface ZodToolDefinition<T extends z.ZodType> extends Omit<
  ToolDefinition,
  "input" | "output"
> {
  input?: T;
  output?: z.ZodType;
  call: (args: z.infer<T>) => Awaitable<ToolResponse>;
}

export function defineTool<T extends z.ZodType>(
  opt: ZodToolDefinition<T>,
): ToolDefinition {
  return {
    ...opt,
    input: opt.input ? z.toJSONSchema(opt.input) : undefined,
    output: opt.output ? z.toJSONSchema(opt.output) : undefined,
  };
}
