import { AgentSideConnection, ndJsonStream } from "@agentclientprotocol/sdk";
import { Readable, Writable } from "node:stream";
import { initGlobalVariables } from "../global";
import { MyBotAcpAgent } from "./agent";

export async function startAcpServer(confPath: string) {
  await initGlobalVariables({ confPath });

  const stream = ndJsonStream(
    Writable.toWeb(process.stdout),
    Readable.toWeb(process.stdin),
  );

  const connection = new AgentSideConnection(
    (conn) => new MyBotAcpAgent(conn),
    stream,
  );

  await connection.closed;
}
