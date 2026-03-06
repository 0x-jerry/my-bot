import { Config } from "../config/types";
import { stepCountIs, SystemModelMessage, ToolLoopAgent, ToolSet } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { loadToolsets } from "../toolset";
import { LoadedToolset } from "../toolset/types";
import { readFile } from "node:fs/promises";
import { nanoid } from "@0x-jerry/utils";
import { MyAgent } from "./types";

export async function createAgent(
  config: Config.Root,
  agentConfig: Config.AgentConfig,
): Promise<MyAgent> {
  const toolsets = await loadToolsets(agentConfig.toolset);

  const id = nanoid();

  const instance = new ToolLoopAgent({
    id,
    model: resolveProvider(agentConfig.model, config),
    instructions: await createInstructions(agentConfig, toolsets),
    tools: resolveTools(toolsets),
    stopWhen: [stepCountIs(agentConfig.context?.maxIterations ?? 20)],
  });

  const agent: MyAgent = {
    id,
    config: agentConfig,
    instance,
    dispose: async () => {
      await Promise.all(toolsets.map((toolset) => toolset.dispose?.()));
    },
  };

  return agent;
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
