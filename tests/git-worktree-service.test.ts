import { afterEach, describe, expect, it } from "vitest";
import { access } from "node:fs/promises";
import { GitWorktreeService } from "../src/git/git-worktree-service.js";
import { createGitRepository, removeGitRepository } from "./support/git-repository.js";

const repositories: string[] = [];

afterEach(async () => {
  await Promise.all(repositories.splice(0).map(removeGitRepository));
});

describe("GitWorktreeService", () => {
  it("creates distinct branch and worktree generations for repeated task claims", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const git = new GitWorktreeService(repositoryPath);

    const first = await git.provision("task-123", 1);
    const second = await git.provision("task-123", 2);

    expect(second.branch).not.toBe(first.branch);
    expect(second.worktreePath).not.toBe(first.worktreePath);
    await expect(access(first.worktreePath)).resolves.toBeUndefined();
    await expect(access(second.worktreePath)).resolves.toBeUndefined();
  });
});
