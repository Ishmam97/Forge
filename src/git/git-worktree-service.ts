import { execFile as execFileCallback } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export class GitWorktreeService {
  readonly #repositoryPath: string;
  readonly #worktreeRoot: string;

  constructor(repositoryPath: string) {
    this.#repositoryPath = resolve(repositoryPath);
    this.#worktreeRoot = join(dirname(this.#repositoryPath), ".agentbus-worktrees", basename(this.#repositoryPath));
  }

  async provision(taskId: string, leaseEpoch: number): Promise<{ branch: string; worktreePath: string }> {
    const claimGeneration = `${taskId}-${leaseEpoch}`;
    const branch = `agentbus/${claimGeneration}`;
    const worktreePath = join(this.#worktreeRoot, claimGeneration);
    await mkdir(this.#worktreeRoot, { recursive: true });
    await execFile("git", ["worktree", "add", "-b", branch, worktreePath, "HEAD"], {
      cwd: this.#repositoryPath,
    });
    return { branch, worktreePath };
  }
}
