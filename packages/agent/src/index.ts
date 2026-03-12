import "dotenv/config";
import { setupServer } from "./server";
import { initGlobalVariables } from "./global";

start();

async function start() {
  const confPath =
    process.env.CONFIG_PATH || process.argv.slice(2).at(0) || "agent.yaml";

  if (!confPath) {
    throw new Error(`Please set config path`);
  }

  await initGlobalVariables({ confPath });

  setupServer();
}
