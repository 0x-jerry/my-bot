import { Agent } from "@my-bot/protocol";
import axios from "axios";

export interface CagentAdapterOptions {
  baseUrl: string;
}

export class CagentAdapter implements Agent.Adapter {
  id = 'cagent'
  name = 'Cagent'
  description = 'Adapter for cagent API'

  _baseUrl: string;
  _sessionAgentMap: Map<string, string> = new Map();

  sessions: Agent.SessionsAdapter;
  messages: Agent.MessagesAdapter;

  constructor(options: CagentAdapterOptions) {
    this._baseUrl = options.baseUrl;

    this.sessions = new CagentSessionsAdapter(this._baseUrl);
    this.messages = new CagentMessageAdapter(this._baseUrl, (sessionId) => this._sessionAgentMap.get(sessionId));
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
    const response = await axios.get(`${this._baseUrl}/api/agents`);
    return response.data;
  }

  async useAgent(sessionId: string, agentId: string): Promise<void> {
    this._sessionAgentMap.set(sessionId, agentId);
  }
}

class CagentSessionsAdapter implements Agent.SessionsAdapter {
  constructor(protected _baseUrl: string) {}

  async create(): Promise<Agent.Session> {
    const response = await axios.post(`${this._baseUrl}/api/sessions`, {});
    return response.data;
  }

  async list(): Promise<Agent.Session[]> {
    const response = await axios.get(`${this._baseUrl}/api/sessions`);
    return response.data;
  }

  async get(sessionId: string): Promise<Agent.Session> {
    const response = await axios.get(`${this._baseUrl}/api/sessions/${sessionId}`);
    return response.data;
  }

  async delete(sessionId: string): Promise<void> {
    await axios.delete(`${this._baseUrl}/api/sessions/${sessionId}`);
  }

  async update(sessionId: string, session: Agent.Session): Promise<void> {
    // The cagent API documentation shows PATCH for title and permissions, not a full PUT/PATCH for the whole session object.
    // For now, we'll implement a PATCH for title as an example.
    await axios.patch(`${this._baseUrl}/api/sessions/${sessionId}/title`, {
      title: session.title,
    });
  }

  async resume(sessionId: string): Promise<void> {
    await axios.post(`${this._baseUrl}/api/sessions/${sessionId}/resume`);
  }
}

class CagentMessageAdapter implements Agent.MessagesAdapter {
  constructor(
    protected _baseUrl: string,
    private getAgentIdForSession: (sessionId: string) => string | undefined
  ) {}

  async *send(sessionId: string, message: string): AsyncIterable<Agent.StreamEvent> {
    const agentId = this.getAgentIdForSession(sessionId);
    if (!agentId) {
      throw new Error(`No agent selected for session ${sessionId}`);
    }
    const url = `${this._baseUrl}/api/sessions/${sessionId}/agent/${agentId}`;
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

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const eventData = JSON.parse(line.substring(6));
            yield eventData as Agent.StreamEvent;
          } catch (error) {
            console.error("Error parsing SSE event:", error);
          }
        }
      }
    }
  }

  async delete(sessionId: string, messageId: string): Promise<void> {
    // The cagent API documentation does not explicitly show an endpoint for deleting individual messages.
    // This might require further investigation or a different approach.
    console.warn(`Deleting individual messages is not directly supported by cagent API for session ${sessionId}, message ${messageId}.`);
  }

  async getAll(sessionId: string): Promise<Agent.Message[]> {
    // The cagent API documentation shows getting a session by ID returns messages, tokens, permissions.
    // We'll extract messages from there.
    const response = await axios.get(`${this._baseUrl}/api/sessions/${sessionId}`);
    // Assuming the response.data contains a 'messages' array.
    return response.data.messages || [];
  }
}
