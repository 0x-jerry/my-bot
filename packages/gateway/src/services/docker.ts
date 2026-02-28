import { exec } from "@0x-jerry/utils/node";
import { getWorkspaceRoot } from "./session";

async function create(sessionId: number): Promise<void> {
  const workspaceRoot = getWorkspaceRoot(sessionId);
  const containerName = getContainerName(sessionId);
  const baseImage = "node-dev-image:1";

  const args = [
    ["-v", `${workspaceRoot}:/app`],
    ["-w", "/app"],
    ["--name", containerName],
  ]
    .map(([k, v]) => [k, JSON.stringify(v)])
    .flat();

  const cmd = ["docker", "run", "-d", ...args, baseImage];
  await exec(cmd.join(" "), { collectOutput: true });
}

export async function createOrStart(sessionId: number): Promise<void> {
  const state = await getContainerState(sessionId);
  if (!state) {
    return create(sessionId);
  }

  if (state.State === "exited") {
    return restart(sessionId);
  }
}

async function restart(sessionId: number) {
  const containerName = getContainerName(sessionId);

  await exec(`docker start ${JSON.stringify(containerName)}`, {
    collectOutput: true,
  });
}

async function getContainerState(sessionId: number) {
  const containerName = getContainerName(sessionId);

  const result = await exec("docker ps --format json -a", {
    collectOutput: true,
  });
  interface DockerState {
    ID: string;
    Image: string;
    Names: string;
    State: "running" | "exited" | "created";
  }

  const states: DockerState[] = [];

  const rows = result.split("\n");

  for (const row of rows) {
    states.push(JSON.parse(row));
  }

  return states.filter((s) => s.Names === containerName).at(0);
}

export async function executeShellCommand(
  sessionId: number,
  cmd: string,
  opt?: { timeout?: number; cwd?: string },
): Promise<string> {
  const name = getContainerName(sessionId);
  const { timeout = 60_000, cwd = "/app" } = opt || {};

  const result = await exec(
    `docker exec -w ${JSON.stringify(cwd)} ${name} ${cmd}`,
    {
      timeout,
      collectOutput: true,
    },
  );

  return result;
}

export function getContainerName(sessionId: number) {
  return `c-${sessionId}`;
}
