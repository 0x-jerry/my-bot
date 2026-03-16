import type { AssistantContent, UIMessageChunk, UserContent } from "ai";

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

    /**
     * Sessions Adapter
     */
    sessions: SessionsAdapter;

    /**
     * Messages Adapter
     */
    messages: MessagesAdapter;

    on<T extends keyof AdapterEvents>(
      event: T,
      callback: (...args: AdapterEvents[T]) => void,
    ): void;
  }

  export interface AdapterEvents {
    /**
     * Register a callback function to be called when a message is received.
     */
    message: [sessionId: string, message: Common.AgentMessageContent];
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
    send(sessionId: string, message: Common.UserMessageContent): AsyncIterable<StreamUIMessage>;

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

  export type StreamUIMessage = UIMessageChunk;
}

export namespace Common {
  export interface Command {
    /**
     * Can contain only lowercase English letters, digits and underscores.
     */
    command: string;
    description: string;
  }

  export type UserMessageContent = UserContent;

  export type AgentMessageContent = AssistantContent;
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
    send(chatId: string, content: Common.AgentMessageContent): Promise<void>;

    /**
     * Reply to a message in a chat.
     */
    reply(
      chatId: string,
      messageId: string,
      content: Common.AgentMessageContent,
    ): Promise<void>;

    /**
     * Set the commands for the bot.
     */
    setCommands(commands: Common.Command[]): Promise<void>;

    on<T extends keyof AdapterEvents>(
      event: T,
      callback: (...args: AdapterEvents[T]) => void,
    ): void;

    /**
     * Handle webhook requests.
     */
    handleWebhook(req: Request): Promise<Response>;
  }

  export interface AdapterEvents {
    command: [event: CommandEvent];
    message: [event: MessageEvent];
  }

  export interface EventBase {
    userId: string;
    chatId: string;
    messageId: string;

    send(content: Common.AgentMessageContent): Promise<void>;
    reply(content: Common.AgentMessageContent): Promise<void>;
  }

  export interface MessageEvent extends EventBase {
    content: Common.UserMessageContent;
  }

  export interface CommandEvent extends EventBase {
    command: string;
    args?: string | null;
  }
}
