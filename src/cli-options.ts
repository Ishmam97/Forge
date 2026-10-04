export interface ServeOptions {
  repositoryPath: string;
  configPath?: string;
}

export function parseServeOptions(argumentsList: readonly string[]): ServeOptions {
  const [command, ...flags] = argumentsList;
  if (command !== "serve") throw new Error("Usage: agentbus serve --repo <path> [--config <path>]");
  const repositoryFlag = flags.indexOf("--repo");
  const repositoryPath = repositoryFlag >= 0 ? flags[repositoryFlag + 1] : undefined;
  const configFlag = flags.indexOf("--config");
  const configPath = configFlag >= 0 ? flags[configFlag + 1] : undefined;
  if (!repositoryPath || (configFlag >= 0 && !configPath)) {
    throw new Error("Usage: agentbus serve --repo <path> [--config <path>]");
  }
  return { repositoryPath, ...(configPath === undefined ? {} : { configPath }) };
}
