#!/usr/bin/env node

import { startAgentBusServer } from "./http/server.js";
import { parseServeOptions } from "./cli-options.js";

const { repositoryPath, configPath } = parseServeOptions(process.argv.slice(2));

const server = await startAgentBusServer({ repositoryPath, ...(configPath === undefined ? {} : { configPath }) });
process.stdout.write(`AgentBus listening at ${server.url}\n`);

const shutdown = async (): Promise<void> => {
  await server.close();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
