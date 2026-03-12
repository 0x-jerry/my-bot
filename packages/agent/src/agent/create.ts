import type { Config } from "../config/types";
import {
  type ModelMessage,
  stepCountIs,
  type SystemModelMessage,
  ToolLoopAgent,
  type ToolSet,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { loadDynamicToolsets, loadStaticToolsets } from "../toolset";
import type { LoadedToolset } from "../toolset/types";
import { readFile } from "node:fs/promises";
import { gv } from "../global";

export class MyAgentImplement {
  config: Config.AgentConfig;

  toolsets: LoadedToolset[] = [];

  abortController?: AbortController;

  _initlized = false;

  constructor(agentConfig: Config.AgentConfig) {
    this.config = agentConfig;
  }

  async init() {
    if (this._initlized) {
      return;
    }

    this._initlized = true;

    const agentConfig = this.config;

    this.toolsets = await loadStaticToolsets(agentConfig.toolset);
  }

  async runChatLoop(messages: ModelMessage[], sessionId: string) {
    await this.init();

    if (this.abortController) {
      this.abortController.abort();
    }

    const agentConfig = this.config;

    const dynamicToolsets = await loadDynamicToolsets(
      sessionId,
      agentConfig.toolset,
    );

    try {
      const mergedToolsets = [...this.toolsets, ...dynamicToolsets];

      const instance = new ToolLoopAgent({
        model: resolveProvider(agentConfig.model, gv.config),
        instructions: await createInstructions(agentConfig, mergedToolsets),
        tools: resolveTools(mergedToolsets),
        stopWhen: [stepCountIs(agentConfig.context?.maxIterations ?? 100)],
      });

      this.abortController = new AbortController();

      const output = await instance.generate({
        abortSignal: this.abortController.signal,
        messages,
      });

      return output;
    } finally {
      await Promise.all(dynamicToolsets.map((toolset) => toolset?.dispose?.()));
    }
  }

  async dispose() {
    await Promise.all(this.toolsets.map((toolset) => toolset?.dispose?.()));
  }
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

  if (provider && modelName) {
    const providerConfig = config.provider?.[provider];

    if (providerConfig) {
      if (providerConfig.type === "openai-compatible") {
        const openai = createOpenAICompatible({
          name: providerConfig.name ?? provider,
          baseURL: providerConfig.baseUrl,
          apiKey: providerConfig.apiKey ?? process.env.OPENAI_API_KEY,
        });

        return openai(modelName);
      }
    }
  }

  return model;
}
