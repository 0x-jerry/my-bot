import { tool } from "ai";
import type { LoadedToolset, ToolSet } from "./types";
import z from "zod";
import { gv } from "../global";

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
    execute: async ({ cron, reason }) => {
      const cronJob = await gv.db.seesionCronJob.create({
        data: {
          sessionId,
          cron,
          reason,
        },
      });

      return `Cron job ${cronJob.id} added`;
    },
  });

  const listRules = tool({
    description: "List all the rules you have added",
    inputSchema: z.object({}),
    execute: async () => {
      const cronJobs = await gv.db.seesionCronJob.findMany({
        where: {
          sessionId,
        },
      });

      return {
        rules: cronJobs.map((job) => ({
          id: job.id,
          createdAt: job.createdAt,
          cron: job.cron,
          reason: job.reason,
        })),
      };
    },
  });

  const deleteRule = tool({
    description: "Delete a rule you have added",
    inputSchema: z.object({
      id: z.string().describe("The ID of the rule to delete"),
    }),
    execute: async ({ id }) => {
      await gv.db.seesionCronJob.delete({
        where: {
          id,
        },
      });

      return `Cron job ${id} deleted`;
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
