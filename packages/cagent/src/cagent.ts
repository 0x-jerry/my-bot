import { Agent } from "@my-bot/spec";
import got from "got";

export interface CagentAdapterOptions {
  baseUrl: string;
}

export class CagentAdapter implements Agent.Adapter {
  name = "Cagent";
  description = "Adapter for cagent API";

  _baseUrl: string;
  _sessionAgentMap: Map<string, string> = new Map();

  sessions: Agent.SessionsAdapter;
  messages: Agent.MessagesAdapter;

  constructor(options: CagentAdapterOptions) {
    this._baseUrl = options.baseUrl;

    this.sessions = new CagentSessionsAdapter(this._baseUrl);
    this.messages = new CagentMessageAdapter(this._baseUrl, (sessionId) =>
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
    const response = (await got
      .get(`${this._baseUrl}/api/agents`)
      .json()) as any;
    // Map Docker cagent Agent format to AgentInfo
    return (response || []).map((agent: any) => ({
      id: agent.name,
      name: agent.name,
      description: agent.description || "",
    }));
  }

  async useAgent(sessionId: string, agentId: string): Promise<void> {
    this._sessionAgentMap.set(sessionId, agentId);
  }
}

class CagentSessionsAdapter implements Agent.SessionsAdapter {
  constructor(protected _baseUrl: string) {}

  async create(): Promise<Agent.Session> {
    const response = await got
      .post(`${this._baseUrl}/api/sessions`, { json: {} })
      .json();

    // Map Docker cagent SessionsResponse to Session interface
    const sessionResponse = response as any;
    const session: Agent.Session = {
      id: sessionResponse.id,
      title: sessionResponse.title || "",
      metadata: {
        createdAt: sessionResponse.created_at,
        numMessages: sessionResponse.num_messages,
        inputTokens: sessionResponse.input_tokens,
        outputTokens: sessionResponse.output_tokens,
        workingDir: sessionResponse.working_dir,
      },
    };

    // Enable yolo mode
    await got.post(`${this._baseUrl}/api/sessions/${session.id}/tools/toggle`);

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
      metadata: {
        createdAt: sessionResponse.created_at,
        numMessages: sessionResponse.num_messages,
        inputTokens: sessionResponse.input_tokens,
        outputTokens: sessionResponse.output_tokens,
        workingDir: sessionResponse.working_dir,
      },
    }));
  }

  async get(sessionId: string): Promise<Agent.Session> {
    const response = await got
      .get(`${this._baseUrl}/api/sessions/${sessionId}`)
      .json();
    // Map Docker cagent SessionResponse to Session interface
    const sessionResponse = response as any;
    return {
      id: sessionResponse.id,
      title: sessionResponse.title || "",
      metadata: {
        createdAt: sessionResponse.created_at,
        toolsApproved: sessionResponse.tools_approved,
        thinking: sessionResponse.thinking,
        inputTokens: sessionResponse.input_tokens,
        outputTokens: sessionResponse.output_tokens,
        workingDir: sessionResponse.working_dir,
        permissions: sessionResponse.permissions,
      },
    };
  }

  async delete(sessionId: string): Promise<void> {
    await got.delete(`${this._baseUrl}/api/sessions/${sessionId}`);
  }

  async update(sessionId: string, session: Agent.Session): Promise<void> {
    // The cagent API documentation shows PATCH for title and permissions, not a full PUT/PATCH for the whole session object.
    // For now, we'll implement a PATCH for title as an example.
    await got.patch(`${this._baseUrl}/api/sessions/${sessionId}/title`, {
      json: { title: session.title },
    });
  }

  async resume(sessionId: string): Promise<void> {
    await got.post(`${this._baseUrl}/api/sessions/${sessionId}/resume`);
  }
}

class CagentMessageAdapter implements Agent.MessagesAdapter {
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const line = decoder.decode(value, { stream: true });

      // Handle SSE format: "data: {...}"
      const lines = line.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const eventData = JSON.parse(line.slice(6)); // Remove "data: " prefix
          // Map Docker cagent SSE events to protocol StreamEvent
          const data = this._mapStreamEvent(eventData, sessionId, agentId);

          if (data) {
            yield data;
          }
        }
      }
    }
  }

  _mapStreamEvent(
    eventData: any,
    sessionId: string,
    agentId: string,
  ): Agent.StreamEvent | null {
    // Map the Docker cagent SSE event to the protocol StreamEvent
    const baseEvent: Agent.StreamEvent = {
      type: "stream_started", // Default type
      session_id: sessionId,
      agent: agentId,
    };

    switch (eventData.type) {
      case "stream_started":
        baseEvent.type = "stream_started";
        break;

      case "stream_stopped":
        baseEvent.type = "stream_stopped";
        break;

      case "agent_choice":
        baseEvent.type = "agent_choice";
        baseEvent.content = eventData.content;
        break;

      case "tool_call":
        // Map to tool_call with ToolCall object
        baseEvent.type = "tool_call";
        baseEvent.tool_call = {
          id: eventData.tool_call.id,
          name: eventData.tool_call.function.name,
          arguments: eventData.tool_call.function.arguments,
        };
        break;

      case "tool_call_response":
        // Map to tool_call_response with content
        baseEvent.type = "tool_call_response";
        baseEvent.content = eventData.response;
        baseEvent.tool_call = {
          id: eventData.tool_call.id,
          name: eventData.tool_call.function.name,
          arguments: eventData.tool_call.function.arguments,
        };
        break;

      case "error":
        baseEvent.type = "error";
        baseEvent.content = eventData.error;
        break;

      default:
        // Unknown event type, skip it
        return null;
    }

    return baseEvent;
  }

  async delete(sessionId: string, messageId: string): Promise<void> {
    // The cagent API documentation does not explicitly show an endpoint for deleting individual messages.
    // This might require further investigation or a different approach.
    console.warn(
      `Deleting individual messages is not directly supported by cagent API for session ${sessionId}, message ${messageId}.`,
    );
  }

  async getAll(sessionId: string): Promise<Agent.Message[]> {
    // The cagent API documentation shows getting a session by ID returns messages, tokens, permissions.
    // We'll extract messages from there.
    const response = await got
      .get(`${this._baseUrl}/api/sessions/${sessionId}`)
      .json<any>();

    // Map Docker cagent session messages to protocol Message
    return (response.messages || []).map((item: any) => {
      const msg = item.message;
      return {
        role: msg.role,
        content: msg.content,
        tool_call_id: msg.tool_call_id,
      };
    });
  }
}
