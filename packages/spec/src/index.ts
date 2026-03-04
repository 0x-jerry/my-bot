export namespace Agent {
  /**
   * Agent Adapter Interface
   * This interface defines how the bridge interacts with different agent backends.
   */
  export interface Adapter {
    name: string;
    description: string;

    /**
     * Start the agent.
     */
    start(): Promise<void>;
    /**
     * Stop the agent.
     */
    stop(): Promise<void>;

    /**
     * List all agents.
     */
    agents(): Promise<AgentInfo[]>;

    useAgent(sessionId: string, agentId: string): Promise<void>;

    /**
     * Sessions Adapter
     */
    sessions: SessionsAdapter;

    /**
     * Messages Adapter
     */
    messages: MessagesAdapter;
  }

  export interface AgentInfo {
    id: string;
    name: string;
    description: string;
  }

  export interface SessionCreateOptions {
    workingDir?: string;
  }

  export interface SessionsAdapter {
    /**
     * Create a new session with this agent.
     */
    create(opt?: SessionCreateOptions): Promise<Session>;
    /**
     * List all sessions for this agent.
     */
    list(): Promise<Session[]>;
    /**
     * Get a session by ID.
     */
    get(sessionId: string): Promise<Session>;
    /**
     * Delete a session by ID.
     */
    delete(sessionId: string): Promise<void>;
    /**
     * Update a session by ID.
     */
    update(sessionId: string, session: Session): Promise<void>;

    /**
     * Resume a session by ID.
     */
    resume(sessionId: string): Promise<void>;
  }

  export interface MessagesAdapter {
    /**
     * Send messages to the agent in a session and get a stream of events.
     */
    send(sessionId: string, message: string): AsyncIterable<StreamEvent>;

    /**
     * Interrupt message processing
     */
    interrupt?(sessionId: string, messageId: string): Promise<boolean>;

    /**
     * Delete a session by ID.
     */
    delete(sessionId: string, messageId: string): Promise<void>;

    /**
     * Get all messages in a session.
     */
    getAll(sessionId: string): Promise<Message[]>;
  }

  export interface Session {
    id: string;
    title: string;
    metadata?: {
      [key: string]: any;
      createdAt?: string;
      numMessages?: number;
      workingDir?: string;
      inputTokens?: number;
      outputTokens?: number;
    };
  }

  export interface Message {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    name?: string;
    tool_call_id?: string;
  }

  export type StreamEventType =
    | "stream_started"
    | "stream_stopped"
    | "agent_choice"
    | "tool_call"
    | "tool_call_response"
    | "error";

  export interface StreamEvent {
    type: StreamEventType;
    session_id: string;
    agent: string;
    content?: string;
    tool_call?: ToolCall;
    error?: string;
  }

  export interface ToolCall {
    id: string;
    name: string;
    arguments: string;
  }

  export interface ToolCallResponse {
    tool_call_id: string;
    output: string;
  }
}

export namespace Common {
  export interface Command {
    /**
     * Can contain only lowercase English letters, digits and underscores.
     */
    command: string;
    description: string;
  }
}

export namespace IM {
  /**
   * IM Adapter Interface
   */
  export interface Adapter {
    name: string;

    /**
     * Start the bot.
     */
    start(): Promise<void>;

    /**
     * Stop the bot.
     */
    stop(): Promise<void>;

    /**
     * Send a message to a chat.
     */
    send(chatId: string, text: string): Promise<void>;

    /**
     * Reply to a message in a chat.
     */
    reply(chatId: string, messageId: string, content: string): Promise<void>;

    /**
     * Set the commands for the bot.
     */
    setCommands(commands: Common.Command[]): Promise<void>;

    on<T extends keyof AdapterEvents>(
      event: T,
      callback: (...args: AdapterEvents[T]) => void,
    ): void;
  }

  export interface AdapterEvents {
    command: [event: CommandEvent];
    message: [event: MessageEvent];
  }

  export interface EventBase {
    chatId: string;
    messageId: string;
    userId: string;

    send(content: string): Promise<void>;
    reply(content: string): Promise<void>;
  }

  export interface MessageEvent extends EventBase {
    content: string;
  }

  export interface CommandEvent extends EventBase {
    command: string;
    args?: string | null;
  }
}
