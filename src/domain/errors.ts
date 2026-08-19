export type CommandErrorCode =
  | "SESSION_NOT_AUTHORIZED"
  | "TASK_HANDOFF_INCOMPLETE"
  | "LEASE_FENCE_INVALID"
  | "OPERATION_CONFLICT"
  | "WORKTREE_PROVISION_FAILED";

export class CommandError extends Error {
  constructor(
    readonly code: CommandErrorCode,
    message: string,
    readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CommandError";
  }
}
