import { tool } from "ai";
import type { LoadedToolset, ToolSet } from "./types";
import z from "zod";
import { gv } from "../global";

export async function createTodoToolset(
  _config: ToolSet.Todo,
  sessionId: string,
): Promise<LoadedToolset> {
  const todoRead = tool({
    description: "Read the todo list for the current session",
    inputSchema: z.object({}),
    execute: async () => {
      const todos = await gv.db.sessionTodo.findMany({
        where: {
          sessionId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return {
        todos,
      };
    },
  });

  const todoWrite = tool({
    description: "Write or update a todo item for the current session",
    inputSchema: z.object({
      id: z.string().optional().describe("The ID of the todo item to update. If not provided, a new todo item will be created."),
      content: z.string().describe("The content of the todo item"),
      status: z.enum(["pending", "completed"]).default("pending").describe("The status of the todo item"),
    }),
    execute: async ({ id, content, status }) => {
      if (id) {
        const todo = await gv.db.sessionTodo.update({
          where: {
            id,
          },
          data: {
            content,
            status,
          },
        });
        return `Todo item ${todo.id} updated`;
      } else {
        const todo = await gv.db.sessionTodo.create({
          data: {
            sessionId,
            content,
            status,
          },
        });
        return `Todo item ${todo.id} created`;
      }
    },
  });

  return {
    instruction:
      "Use 'todo:read' to see the current tasks for this session, and 'todo:write' to add or update tasks. " +
      "This helps you keep track of progress and what needs to be done next.",
    toolset: {
      "todo:read": todoRead,
      "todo:write": todoWrite,
    },
  };
}
