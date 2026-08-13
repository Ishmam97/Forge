export type Role = "lead" | "reviewer" | "worker";

export interface RegisterSessionInput {
  operationId: string;
  agentId: string;
  profile: string;
  roles: readonly Role[];
  capabilities: readonly string[];
}

export interface Session {
  sessionId: string;
  agentId: string;
  profile: string;
  roles: Role[];
  capabilities: string[];
}

export interface AgentBusServiceOptions {
  repositoryPath: string;
}

export type TaskState =
  | "unclaimed"
  | "claimed"
  | "in_progress"
  | "merge_ready"
  | "in_review"
  | "changes_requested"
  | "awaiting_human_approval"
  | "blocked"
  | "merged"
  | "cancelled";

export interface CreateTaskInput {
  operationId: string;
  actorSessionId: string;
  title: string;
  objective: string;
  context: string;
  acceptanceCriteria: readonly string[];
  expectedFileScope: readonly string[];
  dependencies: readonly string[];
  eligibleRole: Role;
}

export interface Task {
  taskId: string;
  title: string;
  objective: string;
  context: string;
  acceptanceCriteria: string[];
  expectedFileScope: string[];
  dependencies: string[];
  eligibleRole: Role;
  state: TaskState;
}

export interface ClaimTaskInput {
  operationId: string;
  sessionId: string;
  taskId: string;
}

export type ClaimResult =
  | {
      kind: "claimed";
      taskId: string;
      leaseId: string;
      leaseEpoch: number;
      worktreePath: string;
      branch: string;
    }
  | { kind: "not_claimable"; taskId: string };

export class OperationConflictError extends Error {
  constructor(operationId: string, expectedCommandType: string, actualCommandType: string) {
    super(`Operation ${operationId} belongs to ${actualCommandType}, not ${expectedCommandType}`);
    this.name = "OperationConflictError";
  }
}
