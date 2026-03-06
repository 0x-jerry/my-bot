import { loadEnvFile } from "node:process";
import { setupServer } from "./server";
import { initGlobalVariables } from "./global";

loadEnvFile();
start();

async function start() {
  // todo, use cli framework to parse args
  const [confPath] = process.argv.slice(2);

  await initGlobalVariables({ confPath });

  setupServer();
}
