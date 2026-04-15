import {
  RequestError,
  type AgentCapabilities,
  type McpServer,
  type SessionInfo,
  type SessionModeState,
} from "@agentclientprotocol/sdk";
import { isAbsolute } from "node:path";
import { gv } from "../global";

export interface StoredSessionMetadata {
  cwd: string;
  mcpServers?: McpServer[];
}

export function createAgentCapabilities(): AgentCapabilities {
  return {
    loadSession: true,
    promptCapabilities: {
      embeddedContext: true,
      image: true,
    },
    sessionCapabilities: {
      list: {},
    },
    mcpCapabilities: {
      http: true,
      sse: true,
    },
  };
}

export function validateWorkspacePath(cwd: string) {
  if (!isAbsolute(cwd)) {
    throw RequestError.invalidParams(undefined, "cwd must be absolute");
  }
}

export function assertNoDynamicMcpServers(mcpServers: McpServer[]) {
  if (mcpServers.length > 0) {
    throw RequestError.invalidParams(undefined, "Dynamic ACP MCP servers are not supported yet");
  }
}

export function getDefaultProfile() {
  const profile = Object.keys(gv.config.agents || {})[0];
  if (!profile) {
    throw new Error("No agent config");
  }
  return profile;
}

export function getModeState(currentModeId: string): SessionModeState {
  const availableModes = Object.entries(gv.config.agents || {}).map(([id, config]) => ({
    id,
    name: config.name || id,
    description: config.description,
  }));

  return {
    availableModes,
    currentModeId,
  };
}

export function readSessionMetadata(raw: string | null): StoredSessionMetadata {
  if (!raw) {
    return {
      cwd: process.cwd(),
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSessionMetadata>;
    return {
      cwd: parsed.cwd || process.cwd(),
      mcpServers: parsed.mcpServers,
    };
  } catch {
    return {
      cwd: process.cwd(),
    };
  }
}

export async function getSessionOrThrow(sessionId: string) {
  const session = await gv.db.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw RequestError.invalidParams(undefined, "Session not found");
  }

  return session;
}

export function toSessionInfo(session: {
  id: string;
  title: string;
  updatedAt: Date;
  metadata: string | null;
}): SessionInfo {
  const metadata = readSessionMetadata(session.metadata);
  return {
    sessionId: session.id,
    title: session.title || undefined,
    cwd: metadata.cwd,
    updatedAt: session.updatedAt.toISOString(),
  };
}
