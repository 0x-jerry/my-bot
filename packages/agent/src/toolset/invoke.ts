import { tool } from "ai";
import type { LoadedToolset, ToolSet } from "./types";
import z from "zod";

export async function createInvokeToolset(
  config: ToolSet.Invoke,
  sessionId: string,
): Promise<LoadedToolset> {
  const addRule = tool({
    description: "Add a rule to invoke yourself",
    inputSchema: z.object({
      cron: z.string().describe("The cron expression to schedule the rule"),
      reason: z.string().describe("The reason why you want to invoke yourself"),
    }),
    execute: async ({ cron, reason: why }) => {
      // TODO: Add the rule to the database

      return {
        cron,
        why,
      };
    },
  });

  const listRules = tool({
    description: "List all the rules you have added",
    inputSchema: z.object({}),
    execute: async () => {
      // TODO: List all the rules from the database

      return {
        rules: [],
      };
    },
  });

  const deleteRule = tool({
    description: "Delete a rule you have added",
    inputSchema: z.object({
      id: z.string().describe("The ID of the rule to delete"),
    }),
    execute: async ({ id }) => {
      // TODO: Delete the rule from the database

      return {
        id,
      };
    },
  });

  return {
    instruction: "You can add, list, and delete rules to invoke yourself",
    toolset: {
      "add-invoke-rule": addRule,
      "list-invoke-rules": listRules,
      "delete-invoke-rule": deleteRule,
    },
  };
}
