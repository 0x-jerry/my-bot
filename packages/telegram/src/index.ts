import "dotenv/config";

import { setupProxyAgent } from "./utils";
import { startBot } from "./bot";

setupProxyAgent()

startBot();
