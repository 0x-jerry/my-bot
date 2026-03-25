import { tool } from "ai";
import type { LoadedToolset, ToolSet } from "./types";
import z from "zod";
import { gv } from "../global";

export async function createMemoryToolset(_config: ToolSet.Memory): Promise<LoadedToolset> {
  const executor = new PrismaMemoryExecutor();

  const addMemory = tool({
    title: "Add memory",
    description: "Add memory into database",
    inputSchema: z.object({
      memory: z.string().describe("The memory to add."),
    }),
    execute: async (input) => {
      return await executor.add(input.memory);
    },
  });

  const searchMemory = tool({
    title: "Search memory",
    description: "Search memory from database",
    inputSchema: z.object({
      query: z.string().describe("The query to search memory."),
      limit: z.number().describe("The number of recent memories to list.").default(10),
    }),
    execute: async (input) => {
      return await executor.search(input.query, { limit: input.limit });
    },
  });

  const listMemories = tool({
    title: "List memories",
    description: "List recent memories in database, default is 20 memories.",
    inputSchema: z.object({
      limit: z.number().describe("The number of recent memories to list.").default(20),
    }),
    execute: async (input) => {
      return await executor.list({ limit: input.limit });
    },
  });

  return {
    instruction:
      `If something is important to remember, use "memory:add" tool to add memory into database. ` +
      `Always use "memory:list" tool to list recent memories before ask user. ` +
      `If something is old, use "memory:search" to search memory from the database.`,
    toolset: {
      "memory:add": addMemory,
      "memory:search": searchMemory,
      "memory:list": listMemories,
    },
  };
}

interface MemoryItem {
  id: string;
  createdAt: Date | number;
  content: string;
}

interface MemoryExecutor {
  list: (opt: { limit: number }) => Promise<MemoryItem[]>;
  add: (memory: string) => Promise<MemoryItem>;
  search: (keyword: string, opt: { limit: number }) => Promise<MemoryItem[]>;
}

class PrismaMemoryExecutor implements MemoryExecutor {
  async list(opt: { limit: number }): Promise<MemoryItem[]> {
    return await gv.db.memory.findMany({
      take: opt.limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async add(memory: string): Promise<MemoryItem> {
    return await gv.db.memory.create({
      data: {
        content: memory,
      },
    });
  }

  async search(query: string, opt: { limit: number }): Promise<MemoryItem[]> {
    return await gv.db.memory.findMany({
      where: {
        content: {
          contains: query,
        },
      },
      take: opt.limit,
    });
  }
}
