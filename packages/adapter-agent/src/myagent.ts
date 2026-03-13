import { EventEmitter } from "@0x-jerry/utils";
import type { Agent } from "@my-bot/spec";
import got from "got";

export interface MyAgentAdapterOptions {
  baseUrl: string;
  debug?: boolean;
}

export class MyAgentAdapter implements Agent.Adapter {
  name = "my-agent";
  description = "Adapter for my agent API";

  _events = new EventEmitter<Agent.AdapterEvents>();

  _baseUrl: string;

  sessions: Agent.SessionsAdapter;
  messages: Agent.MessagesAdapter;

  ws?: WebSocket;

  constructor(options: MyAgentAdapterOptions) {
    this._baseUrl = options.baseUrl;

    this.sessions = new MyAgentSessionsAdapter(this._baseUrl);
    this.messages = new MyAgentMessageAdapter(this._baseUrl);
  }

  on<T extends keyof Agent.AdapterEvents>(
    event: T,
    callback: (...args: Agent.AdapterEvents[T]) => void,
  ): void {
    this._events.on(event, callback);
  }

  async start(): Promise<void> {
    const ws = new WebSocket(`${this._baseUrl}/ws`);
    this.ws = ws;

    ws.addEventListener("message", (evt) => {
      console.log(evt.data);

      const msg = JSON.parse(evt.data);

      if (msg.type === "message") {
        const sessionId = msg.sessionId;
        this._events.emit("message", sessionId, msg.data);
      }
    });
  }

  async stop(): Promise<void> {
    this.ws?.close();
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
  constructor(protected _baseUrl: string) {}

  async *send(
    sessionId: string,
    message: string,
  ): AsyncIterable<Agent.StreamUIMesaage> {
    const url = `${this._baseUrl}/api/sessions/${sessionId}/chat`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ role: "user", content: message }]),
    });

    const responseBody = response;

    return responseBody;
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
