import { tool } from "ai";
import type { LoadedToolset, ToolSet } from "./types";
import z from "zod";
import dayjs from "dayjs";

export async function createEnvToolset(
  _config: ToolSet.Env,
): Promise<LoadedToolset> {
  const getCurrentTime = tool({
    title: "Current Time",
    description: "Get current time",
    inputSchema: z.object({}),
    execute: async ({}) => {
      return dayjs().toDate().toLocaleString();
    },
  });

  return {
    toolset: {
      "env:get-current-time": getCurrentTime,
    },
  };
}
