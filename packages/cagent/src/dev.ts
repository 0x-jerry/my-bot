import { CagentAdapter } from "./cagent";

const cagent = new CagentAdapter({
  baseUrl: "http://localhost:9756",
});

const agents = await cagent.agents();
console.log(agents);

const sessions = await cagent.sessions.list();
console.log(sessions);

const agentId = agents[0].id;
const sessionId = sessions[0].id;

const data = await cagent.sessions.get(sessionId);
console.log(data);

await cagent.useAgent(sessionId, agentId);

const msgs = await cagent.messages.getAll(sessionId);

console.log(msgs);

// for await (const chunk of cagent.messages.send(sessionId, "hello")) {
//   console.log(chunk)
// }
