import { ProxyAgent, setGlobalDispatcher } from "undici";
import { bootstrap } from "global-agent";

export function setupProxyAgent() {
  if (!process.env.GLOBAL_AGENT_HTTP_PROXY) {
    return;
  }
  const proxyAgent = new ProxyAgent(process.env.GLOBAL_AGENT_HTTP_PROXY);
  setGlobalDispatcher(proxyAgent);
  bootstrap();
}
