import { tool, Tool } from "ai";
import { LoadedToolset, ToolSet } from "./types";
import z from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { got } from "got";
import { nanoid } from "@0x-jerry/utils";

export async function createMemoryToolset(
  config: ToolSet.Memory,
): Promise<LoadedToolset> {
  const executor = crateExecutor(config);

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
    }),
    execute: async (input) => {
      return await executor.search(input.query);
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

function crateExecutor(config: ToolSet.Memory): MemoryExecutor {
  if (config.remoteUrl) {
    return new RemoteMemoryExecutor(config.remoteUrl);
  }

  const file = config.file || "./memory.json";
  return new FileMemoryExecutor(file);
}

class FileMemoryExecutor implements MemoryExecutor {
  memories: MemoryItem[] = [];

  constructor(private file: string) {
    this.loadMemories();
  }

  async list(opt: { limit: number }): Promise<MemoryItem[]> {
    return this.memories.slice(-opt.limit);
  }

  async loadMemories(): Promise<MemoryItem[]> {
    try {
      const content = await readFile(this.file, "utf-8");
      this.memories = JSON.parse(content);
    } catch (error) {
      this.memories = [];
    }
    return this.memories;
  }

  async add(memory: string): Promise<MemoryItem> {
    const item: MemoryItem = {
      id: nanoid(),
      createdAt: Date.now(),
      memory: memory,
    };

    this.memories.push(item);
    await this.saveMemories();

    return item;
  }

  async search(keyword: string): Promise<MemoryItem[]> {
    const results = this.memories.filter((item) =>
      item.memory.includes(keyword),
    );

    return results;
  }

  async saveMemories(): Promise<void> {
    await writeFile(this.file, JSON.stringify(this.memories));
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

  async search(keyword: string): Promise<MemoryItem[]> {
    const url = `${this.remoteUrl}/search`;

    const response = await got
      .get(url, {
        searchParams: {
          q: keyword,
        },
      })
      .json<MemoryItem[]>();

    return response;
  }
}

interface MemoryItem {
  id: string;
  createdAt: number;
  memory: string;
}

interface MemoryExecutor {
  list: (opt: { limit: number }) => Promise<MemoryItem[]>;
  add: (memory: string) => Promise<MemoryItem>;
  search: (keyword: string) => Promise<MemoryItem[]>;
}
