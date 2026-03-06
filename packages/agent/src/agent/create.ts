import { Config } from "../config/types";
import { ToolLoopAgent } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { resolveToolset } from "../toolset";

export async function createAgent(
  id: string,
  config: Config.Root,
  agentConfig: Config.AgentConfig,
) {
  const agent = new ToolLoopAgent({
    model: resolveProvider(agentConfig.model, config),
    instructions: agentConfig.instruction,
    tools: await resolveToolset(agentConfig.toolset),
  });

  return {
    id,
    agent,
  };
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
