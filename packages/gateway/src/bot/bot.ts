import { createLogger, type Logger } from "@0x-jerry/utils";
import type { Agent, Common, IM } from "@my-bot/spec";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { getDatabaseClient } from "../database";

export interface BotOption {
  im: IM.Adapter;
  agent: Agent.Adapter;
  workspaceRoot: string;
  debug?: boolean;
  name: string;
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

export class Bot {
  name: string;
  readonly im: IM.Adapter;
  readonly agent: Agent.Adapter;
  readonly log?: Logger;
  readonly workspaceRoot: string;

  _agentResponseState = new Map<string, AgentSessionCacheState>();

  constructor(options: BotOption) {
    this.name = options.name;
    this.im = options.im;
    this.agent = options.agent;
    this.workspaceRoot = options.workspaceRoot;

    if (options.debug) {
      this.log = createLogger(`Bot:${this.name}`);
    }
  }

  async start() {
    await this.im.setCommands(COMMANDS);

    await Promise.all([this.im.start(), this.agent.start()]);

    this.im.on("message", (event: IM.MessageEvent) =>
      this._handleIMMessage(event),
    );

    this.agent.on("message", (sessionId, message) => {
      this._handleAgentMessage(sessionId, message);
    });

    const commandHandler = this._createCommandHandler();
    this.im.on("command", commandHandler);

    console.log(`Bot ${this.name} started`);
  }

  async stop() {
    await Promise.all([this.im.stop(), this.agent.stop()]);
    console.log(`Bot ${this.name} stopped`);
  }

  async _getSessionId(chatId: string): Promise<string | undefined> {
    const db = getDatabaseClient();
    const sessionRecord = await db.botSession.findUnique({
      where: {
        bot_chatId: {
          bot: this.name,
          chatId,
        },
      },
    });
    return sessionRecord?.sessionId;
  }

  async _setSessionId(chatId: string, sessionId: string): Promise<void> {
    const db = getDatabaseClient();
    await db.botSession.upsert({
      where: {
        bot_chatId: {
          bot: this.name,
          chatId,
        },
      },
      update: {
        sessionId,
      },
      create: {
        bot: this.name,
        chatId,
        sessionId,
      },
    });
  }

  async _handleIMMessage(evt: IM.MessageEvent): Promise<void> {
    this.log?.log("handle message: %o", evt);

    try {
      let sessionId = await this._getSessionId(evt.chatId);

      if (!sessionId) {
        const session = await this._createSession(evt.chatId);
        sessionId = session.id;
      }

      const stream = this.agent.messages.send(sessionId, evt.content);

      let responseText = "";

      for await (const chunk of stream) {
        for (const part of chunk.parts) {
          switch (part.type) {
            case "text":
              if (part.state === "streaming") {
                responseText += part.text;
              } else if (part.state === "done") {
                responseText += part.text;
                await evt.send(responseText || "No response received.");
              }
              break;
            default:
              break;
          }
        }
      }
    } catch (error) {
      await evt.send(
        `Sorry, I encountered an error processing your message: ${String(error)}`,
      );
    }
  }

  async _handleAgentMessage(sessionId: string, data: Agent.StreamUIMesaage) {
    let chatSession = this._agentResponseState.get(sessionId);

    if (!chatSession) {
      const chatSessionData = await getDatabaseClient().botSession.findFirst({
        where: {
          bot: this.name,
          sessionId,
        },
      });

      if (!chatSessionData) {
        return;
      }

      chatSession = {
        sessionId,
        chatId: chatSessionData.chatId,
        responseText: "",
      };

      this._agentResponseState.set(sessionId, chatSession);
    }

    for (const part of data.parts) {
      switch (part.type) {
        case "text":
          if (part.state === "streaming") {
            chatSession.responseText += part.text;
          } else if (part.state === "done") {
            chatSession.responseText += part.text;

            if (chatSession.responseText) {
              this._agentResponseState.delete(sessionId);

              await this.im.send(chatSession.chatId, chatSession.responseText);
            }
          }
          break;
        default:
          break;
      }
    }
  }

  _createCommandHandler() {
    const bot = this;
    const { agent } = bot;

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
        const session = await bot._createSession(evt.chatId);

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
          const sessionId = await bot._getSessionId(evt.chatId);
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
          await evt.reply(
            `Failed to select agent ${agentId}: ${String(error)}`,
          );
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

        await bot._setSessionId(evt.chatId, sessionId);
        await evt.reply(`Resumed session ${sessionId}`);
      },
      async usage(evt) {
        const sessionId = await bot._getSessionId(evt.chatId);

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

  async _createSession(chatId: string) {
    const workingDir = `c-${chatId}`;
    await mkdir(path.join(this.workspaceRoot, workingDir), { recursive: true });
    const session = await this.agent.sessions.create({
      workingDir,
    });

    const sessionId = session.id;
    await this._setSessionId(chatId, sessionId);

    // Auto-select the first available agent for a new session
    const firstAgent = (await this.agent.agents()).at(0);
    if (!firstAgent) {
      throw new Error(`No available agent found!`);
    }

    await this.agent.useAgent(sessionId, firstAgent.id);

    return session;
  }
}

interface AgentSessionCacheState {
  sessionId: string;
  chatId: string;
  responseText: string;
}
