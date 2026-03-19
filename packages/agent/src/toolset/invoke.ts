import { tool } from "ai";
import type { LoadedToolset, ToolSet } from "./types";
import z from "zod";
import { gv } from "../global";

export async function createCronToolset(
  _config: ToolSet.Cron,
  sessionId: string,
): Promise<LoadedToolset> {
  const addRule = tool({
    description: "Add a rule to invoke yourself",
    inputSchema: z.object({
      cron: z.string().describe("The cron expression to schedule the rule"),
      reason: z.string().describe("The reason why you want to invoke yourself"),
    }),
    execute: async ({ cron, reason }) => {
      const cronJob = await gv.sessionCronJobs.add(cron, reason, sessionId);

      return `Cron job ${cronJob.id} added`;
    },
  });

  const listRules = tool({
    description: "List all the rules you have added",
    inputSchema: z.object({}),
    execute: async () => {
      const cronJobs = await gv.db.sessionCronJob.findMany({});

      return {
        rules: cronJobs,
      };
    },
  });

  const deleteRule = tool({
    description: "Delete a rule you have added",
    inputSchema: z.object({
      id: z.string().describe("The ID of the rule to delete"),
    }),
    execute: async ({ id }) => {
      await gv.sessionCronJobs.remove(id);

      return `Cron job ${id} deleted`;
    },
  });

  return {
    instruction:
      `You can use "invoke:add-rule", "invoke:list-rules" and "invoke:delete-rule" to invoke yourself.` +
      "You can use those tools to create some daily schedule tasks or one time tasks.",
    toolset: {
      "cron:add": addRule,
      "cron:list": listRules,
      "cron:delete": deleteRule,
    },
  };
}
