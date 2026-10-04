import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadAgentBusConfig } from "../src/config.js";
import { createGitRepository, removeGitRepository } from "./support/git-repository.js";

const repositories: string[] = [];

afterEach(async () => {
  await Promise.all(repositories.splice(0).map(removeGitRepository));
});

describe("AgentBus configuration", () => {
  it("loads validated integration, lease, and relative worktree settings", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const configPath = join(repositoryPath, "agentbus.toml");
    await writeFile(configPath, [
      'integration_branch = "release"',
      "lease_seconds = 45",
      'worktree_root = "../agentbus-sandboxes"',
      "",
    ].join("\n"));

    await expect(loadAgentBusConfig({ repositoryPath, configPath })).resolves.toEqual({
      integrationBranch: "release",
      leaseDurationMs: 45_000,
      worktreeRoot: join(repositoryPath, "..", "agentbus-sandboxes"),
    });
  });

  it("rejects unsafe or invalid configuration values", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const configPath = join(repositoryPath, "agentbus.toml");
    await writeFile(configPath, 'lease_seconds = "soon"\n');

    await expect(loadAgentBusConfig({ repositoryPath, configPath })).rejects.toThrow(
      "lease_seconds must be a positive integer",
    );
  });
});
