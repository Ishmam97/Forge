import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export async function createGitRepository(): Promise<string> {
  const repositoryPath = await mkdtemp(join(tmpdir(), "agentbus-test-"));
  await runGit(repositoryPath, ["init", "--initial-branch=main"]);
  await runGit(repositoryPath, ["config", "user.name", "AgentBus Test"]);
  await runGit(repositoryPath, ["config", "user.email", "agentbus@example.test"]);
  await writeFile(join(repositoryPath, "README.md"), "# test repository\n");
  await runGit(repositoryPath, ["add", "README.md"]);
  await runGit(repositoryPath, ["commit", "-m", "initial commit"]);
  return repositoryPath;
}

export async function removeGitRepository(repositoryPath: string): Promise<void> {
  await rm(repositoryPath, { recursive: true, force: true });
  await rm(join(dirname(repositoryPath), ".agentbus-worktrees", basename(repositoryPath)), {
    recursive: true,
    force: true,
  });
}

export async function runGit(
  cwd: string,
  args: readonly string[],
): Promise<{ stdout: string; stderr: string }> {
  return execFile("git", [...args], { cwd });
}
