import { createLocalAgentServer } from "./server";

const PORT = parseInt(process.env.VYREXO_AGENT_PORT || process.env.PORT || "4040", 10);
const agent = createLocalAgentServer(PORT);

agent.start();

process.on("SIGINT", () => {
  console.log("\nShutting down Vyrexo Local Agent...");
  agent.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  agent.stop();
  process.exit(0);
});
