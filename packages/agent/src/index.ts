import 'dotenv/config'
import { setupServer } from "./server";
import { initGlobalVariables } from "./global";

start();

async function start() {
  // todo, use cli framework to parse args
  const [confPath] = process.argv.slice(2);

  await initGlobalVariables({ confPath });

  setupServer();
}
