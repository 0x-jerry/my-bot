import { createLogger, type Logger } from "@0x-jerry/utils";
import type { Agent, Common, IM } from "@my-bot/spec";
import { name as pkgName } from "../package.json";

export interface BridgeOptions {
  im: IM.Adapter;
  agent: Agent.Adapter;
  debug?: boolean;
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
    command: "change_agent",
    description:
      "Select an agent to use for the current conversation session. Usage: /change-agent <agent_id>",
  },
  {
    command: "sessions",
    description: "List all sessions",
  },
  {
    command: "resume",
    description: "Resume a session by session id, Usage: /resume <session-id>",
  },
  {
    command: "usage",
    description: "Show the current session usage.",
  },
];

export class BotBridge {
  readonly im: IM.Adapter;
  readonly agent: Agent.Adapter;
  readonly log?: Logger;

  /**
   * ChatId => sessionId
   */
  _chatSessionMap: Map<string, string> = new Map();

  constructor(options: BridgeOptions) {
    this.im = options.im;
    this.agent = options.agent;

    this.im.setCommands(COMMANDS);
    if (options.debug) {
      this.log = createLogger(pkgName);
    }
  }

  async start(): Promise<void> {
    await Promise.all([this.im.start(), this.agent.start()]);

    this.im.on("message", (event: IM.MessageEvent) =>
      this._handleMessage(event),
    );

    const commandHandler = this._createCommandHandler();

    this.im.on("command", commandHandler);

    console.log("Bridge started");
  }

  async stop(): Promise<void> {
    await Promise.all([this.im.stop(), this.agent.stop()]);
    console.log("Bridge stopped");
  }

  async _handleMessage(evt: IM.MessageEvent): Promise<void> {
    this.log?.log("handle message: %o", evt);

    try {
      let sessionId = this._chatSessionMap.get(evt.chatId);

      if (!sessionId) {
        const session = await this.agent.sessions.create({
          workingDir: `c-${sessionId}`
        });

        sessionId = session.id;
        this._chatSessionMap.set(evt.chatId, sessionId);

        // Auto-select the first available agent for a new session
        const agent = (await this.agent.agents()).at(0);
        if (!agent) {
          await evt.send(
            "No available agent found. Please contact the administrator.",
          );
          return;
        }

        await this.agent.useAgent(sessionId, agent.id);

        await evt.send(
          `Session ${sessionId} created. Auto-selected agent ${agent.name}`,
        );
      }

      if (!sessionId) {
        throw new Error("Failed to create or retrieve session ID");
      }

      const stream = this.agent.messages.send(sessionId, evt.content);

      let responseText = "";
      for await (const streamEvent of stream) {
        switch (streamEvent.type) {
          case "stream_started":
            // Optional: Send a typing indicator or "Thinking..." message
            break;
          case "stream_stopped":
            // Final response is already sent if we're doing incremental updates
            // But for now, let's just send the whole thing at the end for simplicity
            await evt.send(responseText || "No response received.");
            break;
          case "agent_choice":
            if (streamEvent.content) {
              responseText += streamEvent.content;
            }
            break;
          case "tool_call":
            // Handle tool calls if needed
            await evt.send(
              `Tool call complete: ${streamEvent.tool_call?.name}`,
            );
            break;
          case "error":
            await evt.send(`Error: ${streamEvent.error}`);
            break;
          default:
            break;
        }
      }
    } catch (error) {
      await evt.send(
        `Sorry, I encountered an error processing your message: ${error}`,
      );
    }
  }

  _createCommandHandler() {
    const bridge = this;
    const { agent } = bridge;

    interface CommandHandleMap {
      [command: string]: (evt: IM.CommandEvent) => Promise<void>;
    }

    const commandsHandle: CommandHandleMap = {
      async start(evt) {
        await evt.reply(
          "Welcome! I am your AI assistant. How can I help you today?",
        );
      },
      async agents(evt) {
        const agents = await agent.agents();
        const agentList = agents
          .map((a) => `- ${a.name} (${a.id}): ${a.description}`)
          .join("\n");

        await evt.reply(`Available agents:\n${agentList}`);
      },
      async new(evt) {
        const session = await agent.sessions.create();
        bridge._chatSessionMap.set(evt.chatId, session.id);
        const firstAgent = (await agent.agents()).at(0);

        if (!firstAgent) {
          await evt.reply(
            "No available agent found. Please contact the administrator.",
          );
          return;
        }

        await agent.useAgent(session.id, firstAgent.id);

        await evt.reply(`New session created with ID: ${session.id}`);
      },
      async change_agent(evt) {
        const agentId = evt.args;
        if (!agentId) {
          await evt.reply(
            "Please specify an agent ID. Usage: /change-agent <agent_id>",
          );
          return;
        }

        try {
          const sessionId = bridge._chatSessionMap.get(evt.chatId);
          if (!sessionId) {
            await evt.reply(
              "No active session found. Please start a new session first.",
            );
            return;
          }

          await agent.useAgent(sessionId, agentId);
          await evt.reply(
            `Agent ${agentId} selected for current session ${sessionId}`,
          );
        } catch (error) {
          await evt.reply(`Failed to select agent ${agentId}: ${error}`);
        }
      },
      async sessions(evt) {
        const sessions = await agent.sessions.list();

        const sessionsString = sessions
          .map((n) => `- ${n.title} (${n.id})`)
          .join("\n");

        await evt.reply(`Available sessions:\n${sessionsString}`);
      },
      async resume(evt) {
        const sessionId = evt.args!;

        if (!sessionId) {
          throw new Error(`Miss sessionId!`);
        }

        const session = await agent.sessions.get(sessionId);

        if (!session) {
          throw new Error(`Session ${sessionId} not found!`);
        }

        bridge._chatSessionMap.set(evt.chatId, sessionId);
        evt.reply(`Resumed session ${sessionId}`);
      },
      async usage(evt) {
        const sessionId = bridge._chatSessionMap.get(evt.chatId);

        if (!sessionId) {
          await evt.reply(
            "No active session found. Please start a new session first.",
          );
          return;
        }

        const session = await agent.sessions.get(sessionId);

        await evt.reply(
          `Session (${sessionId})${session.title} usage:\n${JSON.stringify(session.metadata, null, 2)}`,
        );
      },
    };

    return async (evt: IM.CommandEvent) => {
      this.log?.log("handle command: %o", evt);
      const fn = commandsHandle[evt.command];

      if (fn) {
        try {
          await fn(evt);
        } catch (error) {
          await evt.reply(`Command execute failed! Error: ${String(error)}`);
        }
      } else {
        await evt.reply(`Command ${evt.command} not found!`);
      }
    };
  }

  restoreFromData(data: BotBridgeData) {
    this._chatSessionMap = new Map(Object.entries(data.chatSession));
  }

  data(): BotBridgeData {
    const data: BotBridgeData = {
      chatSession: Object.fromEntries(this._chatSessionMap.entries()),
    };

    return data;
  }
}

export interface BotBridgeData {
  chatSession: Record<string, string>;
}
