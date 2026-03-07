import { tool } from "ai";
import { LoadedToolset, ToolSet } from "./types";
import z from "zod";
import { gv } from "../global";
import { got } from "got";

export async function createMemoryToolset(
  config: ToolSet.Memory
): Promise<LoadedToolset> {
  const executor = createExecutor(config);

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
      limit: z
        .number()
        .describe("The number of recent memories to list.")
        .default(10),
    }),
    execute: async (input) => {
      return await executor.search(input.query, { limit: input.limit });
    },
  });

  const listMemories = tool({
    title: "List memories",
    description: "List recent memories in database, default is 20 memories.",
    inputSchema: z.object({
      limit: z
        .number()
        .describe("The number of recent memories to list.")
        .default(20),
    }),
    execute: async (input) => {
      return await executor.list({ limit: input.limit });
    },
  });

  return {
    instruction:
      `If something is important to remember, use "add-memory" tool to add memory into database. ` +
      `Always use "list-memories" tool to list recent memories before ask user. ` +
      `If something is old, search memory from the database.`,
    toolset: {
      "add-memory": addMemory,
      "search-memory": searchMemory,
      "list-memories": listMemories,
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

function createExecutor(config: ToolSet.Memory): MemoryExecutor {
  if (config.remoteUrl) {
    return new RemoteMemoryExecutor(config.remoteUrl);
  }

  return new PrismaMemoryExecutor();
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

class RemoteMemoryExecutor implements MemoryExecutor {
  constructor(private remoteUrl: string) {}

  async list(opt: { limit: number }): Promise<MemoryItem[]> {
    const url = `${this.remoteUrl}/list`;

    const response = await got
      .get(url, {
        searchParams: {
          limit: opt.limit,
        },
      })
      .json<MemoryItem[]>();

    return response;
  }

  async add(memory: string): Promise<MemoryItem> {
    const url = `${this.remoteUrl}/add`;
    const response = await got
      .post(url, {
        json: {
          memory: memory,
        },
      })
      .json<MemoryItem>();

    return response;
  }

  async search(keyword: string, opt: { limit: number }): Promise<MemoryItem[]> {
    const url = `${this.remoteUrl}/search`;

    const response = await got
      .get(url, {
        searchParams: {
          q: keyword,
          limit: opt.limit,
        },
      })
      .json<MemoryItem[]>();

    return response;
  }
}
