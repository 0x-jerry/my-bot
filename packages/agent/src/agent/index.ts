import { gv } from "../global";
import { MyAgentImplement } from "./create";

export class AgentManager {
  agents = new Map<string, MyAgentImplement>();

  async create(profile?: string) {
    if (!profile) {
      profile = Object.keys(gv.config.agents || {})[0];
    }

    const agentConfig = gv.config.agents?.[profile];

    if (!agentConfig) {
      throw new Error(`Agent config not found: ${profile}`);
    }

    const agent = new MyAgentImplement(agentConfig);

    this.agents.set(profile, agent);

    return agent;
  }

  async getOrCreate(profile?: string) {
    if (!profile) {
      profile = Object.keys(gv.config.agents || {})[0];
    }

    const agent = this.agents.get(profile);

    if (agent) {
      return agent;
    }

    return await this.create(profile);
  }

  get(profile: string) {
    return this.agents.get(profile);
  }

  async destroy(profile: string) {
    const agent = this.agents.get(profile);

    if (agent) {
      await agent.dispose();
      this.agents.delete(profile);
    }
  }
}
