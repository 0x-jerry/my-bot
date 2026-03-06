import { Config } from "../config/types";
import { SystemModelMessage, ToolLoopAgent, ToolSet } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { loadToolsets } from "../toolset";
import { LoadedToolset } from "../toolset/types";
import { readFile } from "node:fs/promises";

export async function createAgent(
  id: string,
  config: Config.Root,
  agentConfig: Config.AgentConfig,
) {
  const toolsets = await loadToolsets(agentConfig.toolset);

  const agent = new ToolLoopAgent({
    model: resolveProvider(agentConfig.model, config),
    instructions: await createInstructions(agentConfig, toolsets),
    tools: resolveTools(toolsets),
  });

  return {
    id,
    agent,
  };
}

async function createInstructions(
  config: Config.AgentConfig,
  toolsets: LoadedToolset[],
): Promise<SystemModelMessage[]> {
  const instructions: SystemModelMessage[] = [];

  if (config.instruction) {
    instructions.push({
      role: "system",
      content: config.instruction,
    });
  }

  for (const promptFile of config.context?.extraPrompts || []) {
    const content = await readFile(promptFile, "utf-8");
    //
    instructions.push({
      role: "system",
      content,
    });
  }

  for (const toolset of toolsets) {
    if (toolset.instruction) {
      instructions.push({
        role: "system",
        content: toolset.instruction,
      });
    }
  }

  return instructions;
}

function resolveTools(toolsets: LoadedToolset[]) {
  const tools: ToolSet = {};

  for (const toolset of toolsets) {
    Object.assign(tools, toolset.toolset);
  }

  return tools;
}

function resolveProvider(model: string, config: Config.Root) {
  const [provider, modelName] = model.split("/");

  const providerConfig = config.provider?.[provider];

  if (providerConfig) {
    const openai = createOpenAI({
      baseURL: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey,
    });

    return openai(modelName);
  }

  return model;
}
