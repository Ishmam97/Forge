#!/usr/bin/env node

import { startAgentBusServer } from "./http/server.js";

const [command, ...argumentsList] = process.argv.slice(2);

if (command !== "serve") {
  throw new Error("Usage: agentbus serve --repo <path>");
}

const repositoryFlag = argumentsList.indexOf("--repo");
const repositoryPath = repositoryFlag >= 0 ? argumentsList[repositoryFlag + 1] : undefined;
if (!repositoryPath) {
  throw new Error("Usage: agentbus serve --repo <path>");
}

const server = await startAgentBusServer({ repositoryPath });
process.stdout.write(`AgentBus listening at ${server.url}\n`);

const shutdown = async (): Promise<void> => {
  await server.close();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
