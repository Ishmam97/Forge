import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export class GitWorktreeService {
  readonly #repositoryPath: string;
  readonly #worktreeRoot: string;

  constructor(repositoryPath: string, worktreeRoot?: string) {
    this.#repositoryPath = resolve(repositoryPath);
    this.#worktreeRoot = worktreeRoot === undefined
      ? join(dirname(this.#repositoryPath), ".agentbus-worktrees", basename(this.#repositoryPath))
      : resolve(worktreeRoot);
  }

  async provision(taskId: string, leaseEpoch: number): Promise<{ branch: string; worktreePath: string }> {
    const claimGeneration = `${createHash("sha256").update(taskId).digest("hex").slice(0, 24)}-${leaseEpoch}`;
    const branch = `agentbus/${claimGeneration}`;
    const worktreePath = join(this.#worktreeRoot, claimGeneration);
    await mkdir(this.#worktreeRoot, { recursive: true });
    await execFile("git", ["worktree", "add", "-b", branch, worktreePath, "HEAD"], {
      cwd: this.#repositoryPath,
    });
    return { branch, worktreePath };
  }

  async isClean(worktreePath: string): Promise<boolean> {
    const { stdout } = await execFile("git", ["status", "--porcelain"], { cwd: worktreePath });
    return stdout.trim().length === 0;
  }
}
