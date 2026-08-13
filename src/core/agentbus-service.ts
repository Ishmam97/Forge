import { randomUUID } from "node:crypto";
import type {
  AgentBusServiceOptions,
  ClaimResult,
  ClaimTaskInput,
  CreateTaskInput,
  RegisterSessionInput,
  Session,
  Task,
} from "../domain/types.js";
import { AgentBusDatabase } from "../db/database.js";
import { GitWorktreeService } from "../git/git-worktree-service.js";

export class AgentBusService {
  readonly #database: AgentBusDatabase;
  readonly #git: GitWorktreeService;

  constructor(database: AgentBusDatabase, git: GitWorktreeService) {
    this.#database = database;
    this.#git = git;
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
      throw new Error("Only a registered Lead session can create tasks");
    }
    if (
      input.title.trim().length === 0 ||
      input.objective.trim().length === 0 ||
      input.context.trim().length === 0 ||
      input.acceptanceCriteria.length === 0 ||
      input.expectedFileScope.length === 0
    ) {
      throw new Error("Task handoff data is incomplete");
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
      return this.#database.activateClaim({
        operationId: input.operationId,
        taskId: input.taskId,
        leaseId,
        leaseEpoch: reservation.leaseEpoch,
        ...worktree,
      });
    } catch (error) {
      this.#database.releaseReservedClaim(input.taskId, leaseId);
      throw new Error(`Failed to provision worktree for task ${input.taskId}`, { cause: error });
    }
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
    new GitWorktreeService(options.repositoryPath),
  );
}
