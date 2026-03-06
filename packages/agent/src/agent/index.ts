import { gv } from "../global";
import { createAgent } from "./create";
import { MyAgent } from "./types";

export class AgentManager {
  agents = new Map<string, MyAgent>();

  async create(agentKey?: string) {
    const agentId = agentKey || Object.keys(gv.config.agents || {})[0];
    const agentConfig = gv.config.agents?.[agentId];

    if (!agentConfig) {
      throw new Error(`Agent config not found: ${agentId}`);
    }

    const agent = await createAgent(gv.config, agentConfig);

    this.agents.set(agent.id, agent);

    return agent;
  }

  async get(id: string) {
    return this.agents.get(id);
  }

  async destroy(id: string) {
    const agent = this.agents.get(id);
    await agent?.dispose?.();

    this.agents.delete(id);
  }
}
