import { tool } from "ai";
import { LoadedToolset, ToolSet } from "./types";
import z from "zod";
import { exec } from "@0x-jerry/utils/node";

export async function createShellToolset(
  _config: ToolSet.Shell,
): Promise<LoadedToolset> {
  const shell = tool({
    title: "Shell",
    description: "Run shell commands",
    inputSchema: z.object({
      command: z.string().describe("The shell command to run"),
      timeout: z.number().optional().describe("The timeout in milliseconds"),
    }),
    execute: async ({ command, timeout }) => {
      const output = await exec(command, {
        timeout,
        collectOutput: true,
      });

      return output;
    },
  });

  return {
    toolset: {
      shell,
    },
  };
}
