import { tool } from "ai";
import type { LoadedToolset, ToolSet } from "./types";
import z from "zod";
import { exec } from "@0x-jerry/utils/node";

export async function createShellToolset(
  config: ToolSet.Shell,
): Promise<LoadedToolset> {
  const shell = tool({
    title: "Shell",
    description: "Run shell commands",
    inputSchema: z.object({
      command: z.string().describe("The shell command to run"),
      timeout: z.number().optional().describe("The timeout in milliseconds"),
    }),
    execute: async ({ command, timeout }) => {
      const finalCommand = await rtkRewrite(config, command);

      const output = await exec(finalCommand, {
        timeout,
        collectOutput: true,
      });

      return output;
    },
  });

  return {
    toolset: {
      "shell:execute": shell,
    },
  };
}

async function rtkRewrite(config: ToolSet.Shell, command: string) {
  if (config.rtkRewrite === "off") {
    return command;
  }
  if (!Bun.which("rtk")) {
    return command;
  }

  const rewritedCommand = await exec(`rtk rewrite ${JSON.stringify(command)}`, {
    collectOutput: true,
  });

  if (!rewritedCommand) {
    return command;
  }

  return rewritedCommand;
}
