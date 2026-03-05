import dayjs from "dayjs";
import { getDatabaseClient } from "../database";
import { defineTool } from "./utils";
import z from "zod";

export const addMemory = defineTool({
  name: "add-memory",
  description: "Add memory to the database",
  input: z.object({
    memory: z.string().describe("The memory to add"),
  }),
  call: async (input) => {
    const { memory } = input;

    const memoryRecord = await getDatabaseClient().memory.create({
      data: {
        memory,
      },
    });

    return {
      content: `Memory added successfully! id: ${memoryRecord.id}`,
      meta: {
        id: memoryRecord.id,
      },
    };
  },
});

export const searchMemory = defineTool({
  name: "search-memory",
  description: "Search memory in the database",
  input: z.object({
    keyword: z.string().describe("The memory to search"),
    limit: z
      .number()
      .optional()
      .describe("The maximum number of records to return, default is 10"),
  }),
  call: async (input) => {
    const { keyword, limit = 10 } = input;

    const memoryRecords = await getDatabaseClient().memory.findMany({
      where: {
        memory: {
          contains: keyword,
        },
      },
      take: limit,
    });

    const result = memoryRecords
      .map(
        (record) =>
          `ID: ${record.id} - ${dayjs(record.createdAt).format("YYYY-MM-DD HH:mm:ss")}: ${record.memory}`,
      )
      .join("\n");

    return {
      content: `Found ${memoryRecords.length} memory records:\n${result}`,
      meta: {
        count: memoryRecords.length,
      },
    };
  },
});

export const deleteMemory = defineTool({
  name: "delete-memory",
  description: "Delete memory from the database",
  input: z.object({
    id: z.number().describe("The id of the memory to delete"),
  }),
  call: async (input) => {
    const { id } = input;

    const memoryRecord = await getDatabaseClient().memory.delete({
      where: {
        id,
      },
    });

    return {
      content: `Memory deleted successfully! id: ${memoryRecord.id}`,
      meta: {
        id: memoryRecord.id,
      },
    };
  },
});

export const memoryTools = [addMemory, searchMemory, deleteMemory];
