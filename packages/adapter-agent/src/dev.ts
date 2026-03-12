import { MyAgentAdapter } from "./myagent";

const cagent = new MyAgentAdapter({
  baseUrl: "http://localhost:9756",
});

const agents = await cagent.agents();
console.log(agents);

const sessions = await cagent.sessions.list();
console.log(sessions);

const agentId = agents.at(0)!.id;
const sessionId = sessions.at(0)!.id;

const data = await cagent.sessions.get(sessionId);
console.log(data);

await cagent.useAgent(sessionId, agentId);

const msgs = await cagent.messages.getAll(sessionId);

console.log(msgs);

// for await (const chunk of cagent.messages.send(sessionId, "hello")) {
//   console.log(chunk)
// }
