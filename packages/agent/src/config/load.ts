import { parseJSONC, parseYAML } from "confbox";
import { readFile } from "node:fs/promises";
import type { Config } from "./types";
import { fromJSONSchema } from "zod";
import configSchema from "../../config.schema.json";
import { JSONSchema } from "zod/v4/core";

export async function loadConfig(configFilePath: string): Promise<Config.Root> {
  const fileType = getFileType(configFilePath);

  if (fileType === "unknown") {
    throw new Error(`Unknown config file type: ${configFilePath}`);
  }

  const content = await readFile(configFilePath, "utf-8");

  let loadedConfig: Config.Root | undefined;

  if (fileType === "jsonc") {
    loadedConfig = await parseJSONC(content);
  } else if (fileType === "yaml") {
    loadedConfig = await parseYAML(content);
  }

  if (!loadedConfig) {
    throw new Error(`Un support config file type: ${fileType}`);
  }

  await validateConfig(loadedConfig);

  return loadedConfig;
}

async function validateConfig(config: any): Promise<Config.Root> {
  const schema = fromJSONSchema(configSchema as JSONSchema.JSONSchema);

  const conf = schema.parse(config) as Config.Root;

  for (const agentConfig in conf.agents) {
    const agent = conf.agents[agentConfig]!;
    validateAgentConfig(agent);
  }

  return config;
}

function validateAgentConfig(agentConfig: Config.AgentConfig) {
  const [provider, modelName] = agentConfig.model.split("/");

  if (!provider || !modelName) {
    throw new Error(
      `Invalid model format: ${agentConfig.model}, correct format: providerKey/modelName`,
    );
  }
}

function getFileType(configFile: string) {
  if (configFile.endsWith(".jsonc") || configFile.endsWith(".json")) {
    return "jsonc";
  } else if (configFile.endsWith(".yaml") || configFile.endsWith(".yml")) {
    return "yaml";
  } else {
    return "unknown";
  }
}
