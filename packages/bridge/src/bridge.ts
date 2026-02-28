import type { Agent, Common, IM } from "@my-bot/protocol";

export interface BridgeOptions {
  im: IM.Adapter;
  agent: Agent.Adapter;
}

const COMMANDS: Common.Command[] = [
  {
    command: "start",
    description: "Start a new conversation with the AI assistant.",
  },
  {
    command: "agents",
    description: "List all available agents.",
  },
  {
    command: "new",
    description: "Create a new conversation session.",
  },
  {
    command: "change-agent",
    description:
      "Select an agent to use for the current conversation session. Usage: /change-agent <agent_id>",
  },
];

export class BotBridge {
  readonly im: IM.Adapter;
  readonly agent: Agent.Adapter;
  _chatSessionMap: Map<string, string> = new Map();

  constructor(options: BridgeOptions) {
    this.im = options.im;
    this.agent = options.agent;

    this.im.setCommands(COMMANDS);
  }

  async start(): Promise<void> {
    await Promise.all([this.im.start(), this.agent.start()]);

    this.im.on("message", (event: IM.MessageEvent) =>
      this._handleMessage(event)
    );
    this.im.on("command", (event: IM.CommandEvent) =>
      this._handleCommand(event)
    );

    console.log("Bridge started");
  }

  async stop(): Promise<void> {
    await Promise.all([this.im.stop(), this.agent.stop()]);
    console.log("Bridge stopped");
  }

  async _handleMessage(event: IM.MessageEvent): Promise<void> {
    try {
      let sessionId = this._chatSessionMap.get(event.chatId);

      if (!sessionId) {
        const session = await this.agent.sessions.create();
        sessionId = session.id;
        this._chatSessionMap.set(event.chatId, sessionId);

        // Auto-select the first available agent for a new session
        const agent = (await this.agent.agents()).at(0);
        if (!agent) {
          await this.im.reply(
            event.chatId,
            event.messageId,
            "No available agent found. Please contact the administrator."
          );
          return;
        }

        await this.agent.useAgent(sessionId, agent.id);

        await this.im.reply(
          event.chatId,
          event.messageId,
          `Session ${sessionId} created. Auto-selected agent ${agent.name}`
        );
      }

      if (!sessionId) {
        throw new Error("Failed to create or retrieve session ID");
      }

      const stream = this.agent.messages.send(sessionId, event.content);

      let responseText = "";
      for await (const streamEvent of stream) {
        switch (streamEvent.type) {
          case "stream_started":
            // Optional: Send a typing indicator or "Thinking..." message
            break;
          case "stream_stopped":
            // Final response is already sent if we're doing incremental updates
            // But for now, let's just send the whole thing at the end for simplicity
            await this.im.send(
              event.chatId,
              responseText || "No response received."
            );
            break;
          case "agent_choice":
            if (streamEvent.content) {
              responseText += streamEvent.content;
            }
            break;
          case "tool_call":
            // Handle tool calls if needed
            await this.im.send(
              event.chatId,
              `Tool call requested: ${streamEvent.tool_call?.name}`
            );
            break;
          case "error":
            await this.im.send(event.chatId, `Error: ${streamEvent.error}`);
            break;
          default:
            break;
        }
      }
    } catch (error) {
      await this.im.send(
        event.chatId,
        `Sorry, I encountered an error processing your message: ${error}`
      );
    }
  }

  async _handleCommand(event: IM.CommandEvent): Promise<void> {
    if (event.command === "start") {
      await this.im.reply(
        event.chatId,
        event.messageId,
        "Welcome! I am your AI assistant. How can I help you today?"
      );
      return;
    }

    if (event.command === "agents") {
      const agents = await this.agent.agents();
      const agentList = agents
        .map((a: Agent.AgentInfo) => `- ${a.name} (${a.id}): ${a.description}`)
        .join("\n");
      await this.im.reply(
        event.chatId,
        event.messageId,
        `Available agents:\n${agentList}`
      );
      return;
    }

    if (event.command === "new") {
      const session = await this.agent.sessions.create();
      this._chatSessionMap.set(event.chatId, session.id);
      await this.im.reply(
        event.chatId,
        event.messageId,
        `New session created with ID: ${session.id}`
      );
      return;
    }

    if (event.command === "change-agent") {
      const agentId = event.args;
      if (!agentId) {
        await this.im.reply(
          event.chatId,
          event.messageId,
          "Please specify an agent ID. Usage: /change-agent <agent_id>"
        );
        return;
      }

      try {
        const sessionId = this._chatSessionMap.get(event.chatId);
        if (!sessionId) {
          await this.im.reply(
            event.chatId,
            event.messageId,
            "No active session found. Please start a new session first."
          );
          return;
        }

        await this.agent.useAgent(sessionId, agentId);
        await this.im.reply(
          event.chatId,
          event.messageId,
          `Agent ${agentId} selected for current session ${sessionId}`
        );
      } catch (error) {
        await this.im.reply(
          event.chatId,
          event.messageId,
          `Failed to select agent ${agentId}: ${error}`
        );
      }
    }
  }
}
