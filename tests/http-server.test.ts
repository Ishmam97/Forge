import { afterEach, describe, expect, it } from "vitest";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { assertSupportedPlatform, startAgentBusServer } from "../src/http/server.js";
import { createGitRepository, removeGitRepository } from "./support/git-repository.js";

const repositories: string[] = [];
const servers: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  await Promise.all(repositories.splice(0).map(removeGitRepository));
});

describe("AgentBus HTTP server", () => {
  it("rejects Windows with an actionable unsupported-platform error", () => {
    expect(() => assertSupportedPlatform("win32")).toThrow("Windows is not supported by the AgentBus MVP");
  });

  it("serves health only from a loopback listener for a Git repository", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const server = await startAgentBusServer({ repositoryPath, port: 0 });
    servers.push(server);

    const response = await fetch(`${server.url}/health`);

    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:/);
  });

  it("rejects a nested directory instead of silently binding the enclosing repository", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const nestedPath = join(repositoryPath, "nested");
    await mkdir(nestedPath);

    await expect(startAgentBusServer({ repositoryPath: nestedPath, port: 0 })).rejects.toThrow(
      `must be the Git repository root: ${repositoryPath}`,
    );
  });
});
