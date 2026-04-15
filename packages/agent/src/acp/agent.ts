import {
  PROTOCOL_VERSION,
  RequestError,
  type Agent,
  type AgentSideConnection,
  type AuthenticateRequest,
  type AuthenticateResponse,
  type CancelNotification,
  type InitializeRequest,
  type InitializeResponse,
  type ListSessionsRequest,
  type ListSessionsResponse,
  type LoadSessionRequest,
  type LoadSessionResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  type PromptRequest,
  type PromptResponse,
  type SessionNotification,
  type SessionUpdate,
  type SetSessionConfigOptionRequest,
  type SetSessionConfigOptionResponse,
  type SetSessionModeRequest,
  type SetSessionModeResponse,
} from "@agentclientprotocol/sdk";
import type { ModelMessage, UserContent } from "ai";
import { gv } from "../global";
import { chatWithSession } from "../sessions/chat";
import {
  aiContentToSessionUpdates,
  contentBlocksToAiUserContent,
  streamPartToSessionUpdate,
} from "./content";
import {
  assertNoDynamicMcpServers,
  createAgentCapabilities,
  getDefaultProfile,
  getModeState,
  getSessionOrThrow,
  readSessionMetadata,
  toSessionInfo,
  validateWorkspacePath,
} from "./session-store";

export class MyBotAcpAgent implements Agent {
  private activePrompts = new Map<string, AbortController>();

  constructor(private readonly connection: AgentSideConnection) {}

  async initialize(_params: InitializeRequest): Promise<InitializeResponse> {
    return {
      protocolVersion: PROTOCOL_VERSION,
      agentInfo: {
        name: "my-bot-agent",
        version: "1.0.0",
      },
      agentCapabilities: createAgentCapabilities(),
    };
  }

  async newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
    validateWorkspacePath(params.cwd);
    assertNoDynamicMcpServers(params.mcpServers);

    const profile = getDefaultProfile();
    const session = await gv.db.session.create({
      data: {
        agentProfile: profile,
        metadata: JSON.stringify({
          cwd: params.cwd,
          mcpServers: params.mcpServers,
        }),
      },
    });

    return {
      sessionId: session.id,
      modes: getModeState(profile),
    };
  }

  async loadSession(params: LoadSessionRequest): Promise<LoadSessionResponse> {
    validateWorkspacePath(params.cwd);
    assertNoDynamicMcpServers(params.mcpServers);

    const session = await getSessionOrThrow(params.sessionId);

    await this.replaySessionMessages(session.id);

    return {
      modes: getModeState(session.agentProfile),
    };
  }

  async listSessions(params: ListSessionsRequest): Promise<ListSessionsResponse> {
    const sessions = await gv.db.session.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const filtered = sessions.filter((session) => {
      const metadata = readSessionMetadata(session.metadata);

      if (params.cwd && metadata.cwd !== params.cwd) {
        return false;
      }

      return true;
    });

    return {
      sessions: filtered.map((session) => toSessionInfo(session)),
    };
  }

  async setSessionMode(params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    if (!gv.config.agents?.[params.modeId]) {
      throw RequestError.invalidParams(undefined, "Unknown session mode");
    }

    await getSessionOrThrow(params.sessionId);
    await gv.db.session.update({
      where: { id: params.sessionId },
      data: {
        agentProfile: params.modeId,
      },
    });

    await this.notify(params.sessionId, {
      sessionUpdate: "current_mode_update",
      currentModeId: params.modeId,
    });

    return {};
  }

  async setSessionConfigOption(
    _params: SetSessionConfigOptionRequest,
  ): Promise<SetSessionConfigOptionResponse> {
    throw RequestError.methodNotFound("session/set_config_option");
  }

  async authenticate(_params: AuthenticateRequest): Promise<AuthenticateResponse> {
    throw RequestError.methodNotFound("authenticate");
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    await getSessionOrThrow(params.sessionId);

    const abortController = new AbortController();
    this.activePrompts.set(params.sessionId, abortController);

    const userContent = contentBlocksToAiUserContent(params.prompt);

    try {
      await this.updateSessionTitle(params.sessionId, userContent);

      const streamResult = await chatWithSession(
        params.sessionId,
        [
          {
            role: "user",
            content: userContent,
          } satisfies ModelMessage,
        ],
        {
          abortSignal: abortController.signal,
        },
      );

      for await (const part of streamResult.fullStream) {
        const update = streamPartToSessionUpdate(part);
        if (update) {
          await this.notify(params.sessionId, update);
        }
      }

      return {
        stopReason: abortController.signal.aborted ? "cancelled" : "end_turn",
      };
    } finally {
      this.activePrompts.delete(params.sessionId);
    }
  }

  async cancel(params: CancelNotification): Promise<void> {
    this.activePrompts.get(params.sessionId)?.abort("cancelled");
  }

  async extMethod(
    method: string,
    _params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw RequestError.methodNotFound(method);
  }

  async extNotification(_method: string, _params: Record<string, unknown>): Promise<void> {}

  private async replaySessionMessages(sessionId: string) {
    const messages = await gv.db.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    for (const message of messages) {
      const msg = JSON.parse(message.raw) as ModelMessage;

      const updates = aiContentToSessionUpdates(msg);

      for (const update of updates) {
        this.connection.sessionUpdate({
          sessionId,
          update,
        });
      }
    }
  }

  private async notify(sessionId: string, update: SessionUpdate) {
    const notification: SessionNotification = {
      sessionId,
      update,
    };

    await this.connection.sessionUpdate(notification);
  }

  private async updateSessionTitle(sessionId: string, content: UserContent) {
    const session = await getSessionOrThrow(sessionId);
    if (session.title) {
      return;
    }

    // todo
    const title = "TODO";
    if (!title) {
      return;
    }

    await gv.db.session.update({
      where: { id: sessionId },
      data: { title },
    });

    await this.notify(sessionId, {
      sessionUpdate: "session_info_update",
      title,
      updatedAt: new Date().toISOString(),
    });
  }
}
