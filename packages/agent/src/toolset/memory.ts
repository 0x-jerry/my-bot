import { tool, Tool } from "ai";
import { ToolSet } from "./types";
import z from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { got } from "got";
import { nanoid } from "@0x-jerry/utils";

export async function createMemoryToolset(
  config: ToolSet.Memory,
): Promise<Record<string, Tool>> {
  const executor = crateExecutor(config);

  return {
    addMemory: tool({
      title: "Add memory",
      description: "Add memory into database",
      inputSchema: z.object({
        memory: z.string().describe("The memory to add."),
      }),
      execute: async (input) => {
        return await executor.addMemory(input.memory);
      },
    }),
    searchMemory: tool({
      title: "Search memory",
      description: "Search memory from database",
      inputSchema: z.object({
        query: z.string().describe("The query to search memory."),
      }),
      execute: async (input) => {
        return await executor.searchMemory(input.query);
      },
    }),
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

  async loadMemories(): Promise<MemoryItem[]> {
    try {
      const content = await readFile(this.file, "utf-8");
      this.memories = JSON.parse(content);
    } catch (error) {
      this.memories = [];
    }
    return this.memories;
  }

  async addMemory(memory: string): Promise<MemoryItem> {
    const item: MemoryItem = {
      id: nanoid(),
      createdAt: Date.now(),
      memory: memory,
    };

    this.memories.push(item);
    await this.saveMemories();

    return item;
  }

  async searchMemory(keyword: string): Promise<MemoryItem[]> {
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

  async addMemory(memory: string): Promise<MemoryItem> {
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

  async searchMemory(keyword: string): Promise<MemoryItem[]> {
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
  addMemory: (memory: string) => Promise<MemoryItem>;
  searchMemory: (keyword: string) => Promise<MemoryItem[]>;
}
