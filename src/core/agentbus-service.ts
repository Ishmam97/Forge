import { randomUUID } from "node:crypto";
import type {
  AgentBusServiceOptions,
  ClaimResult,
  ClaimTaskInput,
  CreateTaskInput,
  ExpiredLeaseRecovery,
  HeartbeatInput,
  HeartbeatResult,
  RegisterSessionInput,
  Session,
  Task,
  TaskDetail,
} from "../domain/types.js";
import { AgentBusDatabase } from "../db/database.js";
import { CommandError } from "../domain/errors.js";
import { GitWorktreeService } from "../git/git-worktree-service.js";

export class AgentBusService {
  readonly #database: AgentBusDatabase;
  readonly #git: GitWorktreeService;
  readonly #leaseDurationMs: number;
  readonly #now: () => Date;

  constructor(
    database: AgentBusDatabase,
    git: GitWorktreeService,
    leaseDurationMs: number,
    now: () => Date,
  ) {
    this.#database = database;
    this.#git = git;
    this.#leaseDurationMs = leaseDurationMs;
    this.#now = now;
  }

  async registerSession(input: RegisterSessionInput): Promise<Session> {
    const session: Session = {
      sessionId: randomUUID(),
      agentId: input.agentId,
      profile: input.profile,
      roles: [...input.roles],
      capabilities: [...input.capabilities],
    };
    return this.#database.registerSessionOnce(input.operationId, session);
  }

  async listSessions(): Promise<Session[]> {
    return this.#database.listSessions();
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const actor = this.#database.getSession(input.actorSessionId);
    if (!actor || !actor.roles.includes("lead")) {
      throw new CommandError(
        "SESSION_NOT_AUTHORIZED",
        "Only a registered Lead session can create tasks",
        403,
      );
    }
    if (
      input.title.trim().length === 0 ||
      input.objective.trim().length === 0 ||
      input.context.trim().length === 0 ||
      input.acceptanceCriteria.length === 0 ||
      input.expectedFileScope.length === 0
    ) {
      throw new CommandError("TASK_HANDOFF_INCOMPLETE", "Task handoff data is incomplete", 400);
    }
    const task: Task = {
      taskId: randomUUID(),
      title: input.title,
      objective: input.objective,
      context: input.context,
      acceptanceCriteria: [...input.acceptanceCriteria],
      expectedFileScope: [...input.expectedFileScope],
      dependencies: [...input.dependencies],
      eligibleRole: input.eligibleRole,
      state: "unclaimed",
    };
    return this.#database.createTaskOnce(input.operationId, task);
  }

  async getTaskContext(taskId: string): Promise<Task | undefined> {
    return this.#database.getTask(taskId);
  }

  async getTaskDetail(taskId: string): Promise<TaskDetail | undefined> {
    const task = this.#database.getTask(taskId);
    return task ? { task, events: this.#database.listTaskEvents(taskId) } : undefined;
  }

  async claimTask(input: ClaimTaskInput): Promise<ClaimResult> {
    const replay = this.#database.getOperation<ClaimResult>(input.operationId, "task.claim");
    if (replay) {
      return replay;
    }
    const session = this.#database.getSession(input.sessionId);
    const task = this.#database.getTask(input.taskId);
    if (!session || !task || !session.roles.includes(task.eligibleRole)) {
      return { kind: "not_claimable", taskId: input.taskId };
    }
    const leaseId = randomUUID();
    const reservation = this.#database.reserveClaim({
      taskId: input.taskId,
      sessionId: input.sessionId,
      leaseId,
    });
    if (reservation.kind === "not_claimable") {
      return { kind: "not_claimable", taskId: input.taskId };
    }
    try {
      const worktree = await this.#git.provision(input.taskId, reservation.leaseEpoch);
      const activatedAt = this.#now();
      return this.#database.activateClaim({
        operationId: input.operationId,
        taskId: input.taskId,
        leaseId,
        leaseEpoch: reservation.leaseEpoch,
        activatedAt: activatedAt.toISOString(),
        expiresAt: new Date(activatedAt.getTime() + this.#leaseDurationMs).toISOString(),
        ...worktree,
      });
    } catch (error) {
      this.#database.releaseReservedClaim(input.taskId, leaseId);
      throw new CommandError(
        "WORKTREE_PROVISION_FAILED",
        `Failed to provision worktree for task ${input.taskId}`,
        422,
        { cause: error },
      );
    }
  }

  async heartbeat(input: HeartbeatInput): Promise<HeartbeatResult> {
    const heartbeatAt = this.#now();
    return this.#database.heartbeatOnce(
      input,
      heartbeatAt.toISOString(),
      new Date(heartbeatAt.getTime() + this.#leaseDurationMs).toISOString(),
    );
  }

  async reconcileExpiredLeases(): Promise<ExpiredLeaseRecovery[]> {
    const now = this.#now().toISOString();
    const expiredLeases = this.#database.listExpiredActiveLeases(now);
    const recovered: ExpiredLeaseRecovery[] = [];
    for (const lease of expiredLeases) {
      let kind: ExpiredLeaseRecovery["kind"] = "blocked";
      let reason: ExpiredLeaseRecovery["reason"];
      try {
        if (await this.#git.isClean(lease.worktreePath)) {
          kind = "requeued";
        } else {
          reason = "dirty_worktree";
        }
      } catch (error) {
        reason = "inspection_failed";
        console.warn(`Unable to inspect expired worktree ${lease.worktreePath}`, error);
      }
      const result = this.#database.recoverExpiredLease({ ...lease, now, kind, reason });
      if (result) {
        recovered.push(result);
      }
    }
    return recovered;
  }

  async close(): Promise<void> {
    this.#database.close();
  }
}

export async function createAgentBusService(
  options: AgentBusServiceOptions,
): Promise<AgentBusService> {
  return new AgentBusService(
    await AgentBusDatabase.open(options.repositoryPath),
    new GitWorktreeService(options.repositoryPath, options.worktreeRoot),
    options.leaseDurationMs ?? 15 * 60_000,
    options.now ?? (() => new Date()),
  );
}
