import type { Agent } from "@my-bot/spec";
import got from "got";

export interface MyAgentAdapterOptions {
  baseUrl: string;
  debug?: boolean;
}

export class MyAgentAdapter implements Agent.Adapter {
  name = "my-agent";
  description = "Adapter for my agent API";

  _baseUrl: string;
  _sessionAgentMap: Map<string, string> = new Map();

  sessions: Agent.SessionsAdapter;
  messages: Agent.MessagesAdapter;

  constructor(options: MyAgentAdapterOptions) {
    this._baseUrl = options.baseUrl;

    this.sessions = new MyAgentSessionsAdapter(this._baseUrl);
    this.messages = new MyAgentMessageAdapter(this._baseUrl, (sessionId) =>
      this._sessionAgentMap.get(sessionId),
    );
  }

  async start(): Promise<void> {
    // In a real scenario, you might want to ping the cagent API to verify connectivity
    // and fetch agent details to populate `name` and `description`.
    console.log(`CagentAdapter for ${this._baseUrl} started.`);
  }

  async stop(): Promise<void> {
    console.log(`CagentAdapter for ${this._baseUrl} stopped.`);
  }

  async agents(): Promise<Agent.AgentInfo[]> {
    const response = await got.get(`${this._baseUrl}/api/agents`).json<any[]>();

    // Map Docker cagent Agent format to AgentInfo
    return response.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || "",
    }));
  }

  async useAgent(sessionId: string, agentId: string): Promise<void> {
    this._sessionAgentMap.set(sessionId, agentId);
  }
}

class MyAgentSessionsAdapter implements Agent.SessionsAdapter {
  constructor(protected _baseUrl: string) {}

  async create(opt?: Agent.SessionCreateOptions): Promise<Agent.Session> {
    const response = await got
      .post(`${this._baseUrl}/api/sessions`, {
        json: {
          working_dir: opt?.workingDir,
        },
      })
      .json<any>();

    const session: Agent.Session = {
      id: response.id,
      title: response.title || "",
      metadata: response.metadata || {},
    };

    return session;
  }

  async list(): Promise<Agent.Session[]> {
    const response = await got
      .get(`${this._baseUrl}/api/sessions`)
      .json<any[]>();

    // Map Docker cagent SessionsResponse array to Session interface
    return (response || []).map((sessionResponse) => ({
      id: sessionResponse.id,
      title: sessionResponse.title || "",
      metadata: sessionResponse.metadata || {},
    }));
  }

  async get(sessionId: string): Promise<Agent.Session> {
    const response = await got
      .get(`${this._baseUrl}/api/sessions/${sessionId}`)
      .json<any>();

    return {
      id: response.id,
      title: response.title || "",
      metadata: response.metadata || {},
    };
  }

  async delete(sessionId: string): Promise<void> {
    await got.delete(`${this._baseUrl}/api/sessions/${sessionId}`);
  }

  async update(sessionId: string, session: Agent.Session): Promise<void> {
    // Not support yet, ignored
  }

  async resume(sessionId: string): Promise<void> {
    // No needed to implement
  }
}

class MyAgentMessageAdapter implements Agent.MessagesAdapter {
  constructor(
    protected _baseUrl: string,
    private getAgentIdForSession: (sessionId: string) => string | undefined,
  ) {}

  async *send(
    sessionId: string,
    message: string,
  ): AsyncIterable<Agent.StreamEvent> {
    const agentId = this.getAgentIdForSession(sessionId);

    if (!agentId) {
      throw new Error(`No agent selected for session ${sessionId}`);
    }

    const url = `${this._baseUrl}/api/sessions/${sessionId}/chat`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ role: "user", content: message }]),
    });

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const responseBody: any = await response.json();

    yield {
      type: "agent_choice",
      session_id: sessionId,
      agent: agentId,
      content: responseBody.text,
    };

    yield {
      type: "stream_stopped",
      session_id: sessionId,
      agent: agentId,
    };
  }

  async delete(sessionId: string, messageId: string): Promise<void> {
    // The cagent API documentation does not explicitly show an endpoint for deleting individual messages.
    // This might require further investigation or a different approach.
    console.warn(
      `Deleting individual messages is not directly supported by cagent API for session ${sessionId}, message ${messageId}.`,
    );
  }

  async getAll(sessionId: string): Promise<Agent.Message[]> {
    const messages = await got
      .get(`${this._baseUrl}/api/sessions/${sessionId}/messages`)
      .json<any[]>();

    return messages.map((item: any) => {
      const msg = item.message;
      return {
        role: msg.role,
        content: msg.content,
      };
    });
  }
}
