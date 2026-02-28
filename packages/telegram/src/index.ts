import "dotenv/config";
import 'global-agent/bootstrap'
import { setGlobalDispatcher, ProxyAgent } from 'undici'
import { Bot } from "gramio";

if (process.env.GLOBAL_AGENT_HTTP_PROXY) {
  const proxyAgent = new ProxyAgent(process.env.GLOBAL_AGENT_HTTP_PROXY)
  setGlobalDispatcher(proxyAgent)
}

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string)
    .command("start", (context) => context.send("Hello! I am your new GramIO bot!"))
    .onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));

bot.start();
