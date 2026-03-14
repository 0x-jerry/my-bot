import pc from "picocolors";
import { MyAgentAdapter } from "./myagent";

const agent = new MyAgentAdapter({
  baseUrl: "http://localhost:10080",
});

const session = await agent.sessions.create();

const sessionId = session.id;

console.log("Session created with ID:", sessionId);

await oneTurn("删除所有任务");

await oneTurn("明天早上8点告诉过当天的天气情况");

async function oneTurn(msg: string) {
  const resp = agent.messages.send(sessionId, msg);

  for await (const chunk of resp) {
    switch (chunk.type) {
      case "reasoning-start":
        console.log("Thinking:");
        break;
      case "reasoning-delta":
        process.stdout.write(pc.dim(chunk.delta));
        break;
      case "reasoning-end":
        process.stdout.write("\n");
        break;
      case "text-start":
        console.log("Response:");
        break;
      case "text-delta":
        process.stdout.write(chunk.delta);
        break;
      case "text-end":
        process.stdout.write("\n");
        break;

      case "error":
        console.error("Error:", chunk.errorText);
        break;
      case "tool-input-start":
        console.log("Call tool:", pc.cyan(chunk.toolName), " ");
        break;
      case "tool-input-delta":
        process.stdout.write(pc.cyan(chunk.inputTextDelta));
        break;

      case "tool-output-available":
        console.log("Tool output:", chunk.output);
        break;

      default:
        break;
    }
  }
}
