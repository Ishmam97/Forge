import Database from "better-sqlite3";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  OperationConflictError,
  type ClaimResult,
  type ExpiredLeaseRecovery,
  type HeartbeatInput,
  type HeartbeatResult,
  type Session,
  type Task,
  type TaskEvent,
} from "../domain/types.js";

export class AgentBusDatabase {
  readonly #database: Database.Database;

  private constructor(database: Database.Database) {
    this.#database = database;
  }

  static async open(repositoryPath: string): Promise<AgentBusDatabase> {
    const stateDirectory = join(repositoryPath, ".agentbus");
    await mkdir(stateDirectory, { recursive: true });
    const database = new Database(join(stateDirectory, "state.sqlite"));
    database.pragma("journal_mode = WAL");
    database.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        profile TEXT NOT NULL,
        roles_json TEXT NOT NULL,
        capabilities_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS operations (
        operation_id TEXT PRIMARY KEY,
        command_type TEXT NOT NULL,
        result_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        task_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        objective TEXT NOT NULL,
        context TEXT NOT NULL,
        acceptance_criteria_json TEXT NOT NULL,
        expected_file_scope_json TEXT NOT NULL,
        dependencies_json TEXT NOT NULL,
        eligible_role TEXT NOT NULL,
        state TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS leases (
        lease_id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        lease_epoch INTEGER NOT NULL,
        active INTEGER NOT NULL,
        heartbeat_at TEXT,
        expires_at TEXT,
        revoked_reason TEXT,
        branch TEXT,
        worktree_path TEXT,
        UNIQUE(task_id, lease_epoch)
      );
    `);
    const operationColumns = database.prepare<[], { name: string }>("PRAGMA table_info(operations)").all();
    if (!operationColumns.some((column) => column.name === "command_type")) {
      database.exec("ALTER TABLE operations ADD COLUMN command_type TEXT");
    }
    const leaseColumns = database.prepare<[], { name: string }>("PRAGMA table_info(leases)").all();
    for (const column of ["heartbeat_at", "expires_at", "revoked_reason"] as const) {
      if (!leaseColumns.some((entry) => entry.name === column)) {
        database.exec(`ALTER TABLE leases ADD COLUMN ${column} TEXT`);
      }
    }
    return new AgentBusDatabase(database);
  }

  insertSession(session: Session): void {
    this.#database
      .prepare(
        `INSERT INTO sessions (session_id, agent_id, profile, roles_json, capabilities_json)
         VALUES (@sessionId, @agentId, @profile, @rolesJson, @capabilitiesJson)`,
      )
      .run({
        sessionId: session.sessionId,
        agentId: session.agentId,
        profile: session.profile,
        rolesJson: JSON.stringify(session.roles),
        capabilitiesJson: JSON.stringify(session.capabilities),
      });
  }

  getOperation<T>(operationId: string, commandType: string): T | undefined {
    const operation = this.#database
      .prepare<[string], { command_type: string | null; result_json: string }>(
        "SELECT command_type, result_json FROM operations WHERE operation_id = ?",
      )
      .get(operationId);
    if (!operation) {
      return undefined;
    }
    if (operation.command_type !== commandType) {
      throw new OperationConflictError(operationId, commandType, operation.command_type ?? "legacy operation");
    }
    return JSON.parse(operation.result_json) as T;
  }

  registerSessionOnce(operationId: string, session: Session): Session {
    const operation = this.#database.transaction(() => {
      const previous = this.getOperation<Session>(operationId, "session.register");
      if (previous) {
        return previous;
      }

      this.insertSession(session);
      const resultJson = JSON.stringify(session);
      this.#database
        .prepare(
          "INSERT INTO operations (operation_id, command_type, result_json) VALUES (?, ?, ?)",
        )
        .run(operationId, "session.register", resultJson);
      this.#database
        .prepare(
          `INSERT INTO events (operation_id, event_type, payload_json, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(operationId, "session.registered", resultJson, new Date().toISOString());
      return session;
    });
    return operation.immediate();
  }

  listSessions(): Session[] {
    const rows = this.#database
      .prepare<[], {
        session_id: string;
        agent_id: string;
        profile: string;
        roles_json: string;
        capabilities_json: string;
      }>(
        `SELECT session_id, agent_id, profile, roles_json, capabilities_json
         FROM sessions ORDER BY rowid`,
      )
      .all();
    return rows.map((row) => ({
      sessionId: row.session_id,
      agentId: row.agent_id,
      profile: row.profile,
      roles: JSON.parse(row.roles_json) as Session["roles"],
      capabilities: JSON.parse(row.capabilities_json) as string[],
    }));
  }

  getSession(sessionId: string): Session | undefined {
    return this.listSessions().find((session) => session.sessionId === sessionId);
  }

  createTaskOnce(operationId: string, task: Task): Task {
    const operation = this.#database.transaction(() => {
      const previous = this.getOperation<Task>(operationId, "task.create");
      if (previous) {
        return previous;
      }
      this.#database
        .prepare(
          `INSERT INTO tasks (
            task_id, title, objective, context, acceptance_criteria_json,
            expected_file_scope_json, dependencies_json, eligible_role, state
          ) VALUES (
            @taskId, @title, @objective, @context, @acceptanceCriteriaJson,
            @expectedFileScopeJson, @dependenciesJson, @eligibleRole, @state
          )`,
        )
        .run({
          taskId: task.taskId,
          title: task.title,
          objective: task.objective,
          context: task.context,
          acceptanceCriteriaJson: JSON.stringify(task.acceptanceCriteria),
          expectedFileScopeJson: JSON.stringify(task.expectedFileScope),
          dependenciesJson: JSON.stringify(task.dependencies),
          eligibleRole: task.eligibleRole,
          state: task.state,
        });
      const resultJson = JSON.stringify(task);
      this.#database
        .prepare("INSERT INTO operations (operation_id, command_type, result_json) VALUES (?, ?, ?)")
        .run(operationId, "task.create", resultJson);
      this.#database
        .prepare(
          `INSERT INTO events (operation_id, event_type, payload_json, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(operationId, "task.created", resultJson, new Date().toISOString());
      return task;
    });
    return operation.immediate();
  }

  getTask(taskId: string): Task | undefined {
    const row = this.#database
      .prepare<[string], {
        task_id: string;
        title: string;
        objective: string;
        context: string;
        acceptance_criteria_json: string;
        expected_file_scope_json: string;
        dependencies_json: string;
        eligible_role: Task["eligibleRole"];
        state: Task["state"];
      }>(
        `SELECT task_id, title, objective, context, acceptance_criteria_json,
                expected_file_scope_json, dependencies_json, eligible_role, state
         FROM tasks WHERE task_id = ?`,
      )
      .get(taskId);
    if (!row) {
      return undefined;
    }
    return {
      taskId: row.task_id,
      title: row.title,
      objective: row.objective,
      context: row.context,
      acceptanceCriteria: JSON.parse(row.acceptance_criteria_json) as string[],
      expectedFileScope: JSON.parse(row.expected_file_scope_json) as string[],
      dependencies: JSON.parse(row.dependencies_json) as string[],
      eligibleRole: row.eligible_role,
      state: row.state,
    };
  }

  listTaskEvents(taskId: string): TaskEvent[] {
    return this.#database
      .prepare<
        [string],
        {
          sequence: number;
          operation_id: string;
          event_type: string;
          payload_json: string;
          created_at: string;
        }
      >(
        `SELECT sequence, operation_id, event_type, payload_json, created_at
         FROM events
         WHERE json_extract(payload_json, '$.taskId') = ?
         ORDER BY sequence`,
      )
      .all(taskId)
      .map((event) => ({
        sequence: event.sequence,
        operationId: event.operation_id,
        eventType: event.event_type,
        payload: JSON.parse(event.payload_json) as unknown,
        createdAt: event.created_at,
      }));
  }

  reserveClaim(input: { taskId: string; sessionId: string; leaseId: string }):
    | { kind: "reserved"; leaseEpoch: number }
    | { kind: "not_claimable" } {
    const operation = this.#database.transaction(() => {
      const task = this.#database
        .prepare<[string], { state: Task["state"] }>("SELECT state FROM tasks WHERE task_id = ?")
        .get(input.taskId);
      if (!task || task.state !== "unclaimed" || !this.areDependenciesSatisfied(input.taskId)) {
        return { kind: "not_claimable" } as const;
      }
      const maxEpoch = this.#database
        .prepare<[string], { epoch: number | null }>(
          "SELECT MAX(lease_epoch) AS epoch FROM leases WHERE task_id = ?",
        )
        .get(input.taskId)?.epoch;
      const leaseEpoch = (maxEpoch ?? 0) + 1;
      const update = this.#database
        .prepare("UPDATE tasks SET state = 'claimed' WHERE task_id = ? AND state = 'unclaimed'")
        .run(input.taskId);
      if (update.changes !== 1) {
        return { kind: "not_claimable" } as const;
      }
      this.#database
        .prepare(
          `INSERT INTO leases (lease_id, task_id, session_id, lease_epoch, active)
           VALUES (?, ?, ?, ?, 0)`,
        )
        .run(input.leaseId, input.taskId, input.sessionId, leaseEpoch);
      this.#database
        .prepare(`INSERT INTO events (operation_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?)`)
        .run(`${input.leaseId}:reserve`, "task.claim_reserved", JSON.stringify(input), new Date().toISOString());
      return { kind: "reserved", leaseEpoch } as const;
    });
    return operation.immediate();
  }

  activateClaim(input: {
    operationId: string;
    taskId: string;
    leaseId: string;
    leaseEpoch: number;
    branch: string;
    worktreePath: string;
    activatedAt: string;
    expiresAt: string;
  }): ClaimResult {
    const operation = this.#database.transaction(() => {
      const update = this.#database
        .prepare(
          `UPDATE leases SET active = 1, branch = ?, worktree_path = ?, heartbeat_at = ?, expires_at = ?
           WHERE lease_id = ? AND task_id = ? AND lease_epoch = ? AND active = 0`,
        )
        .run(
          input.branch,
          input.worktreePath,
          input.activatedAt,
          input.expiresAt,
          input.leaseId,
          input.taskId,
          input.leaseEpoch,
        );
      if (update.changes !== 1) {
        return { kind: "not_claimable", taskId: input.taskId } as ClaimResult;
      }
      const taskUpdate = this.#database
        .prepare("UPDATE tasks SET state = 'in_progress' WHERE task_id = ? AND state = 'claimed'")
        .run(input.taskId);
      if (taskUpdate.changes !== 1) {
        throw new Error(`Claim activation lost reservation for task ${input.taskId}`);
      }
      const result: ClaimResult = {
        kind: "claimed",
        taskId: input.taskId,
        leaseId: input.leaseId,
        leaseEpoch: input.leaseEpoch,
        branch: input.branch,
        worktreePath: input.worktreePath,
      };
      const resultJson = JSON.stringify(result);
      this.#database
        .prepare("INSERT INTO operations (operation_id, command_type, result_json) VALUES (?, ?, ?)")
        .run(input.operationId, "task.claim", resultJson);
      this.#database
        .prepare(`INSERT INTO events (operation_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?)`)
        .run(input.operationId, "lease.activated", resultJson, new Date().toISOString());
      return result;
    });
    return operation.immediate();
  }

  releaseReservedClaim(taskId: string, leaseId: string): void {
    const operation = this.#database.transaction(() => {
      this.#database
        .prepare("UPDATE leases SET revoked_reason = 'provision_failed' WHERE lease_id = ? AND active = 0")
        .run(leaseId);
      this.#database.prepare("UPDATE tasks SET state = 'unclaimed' WHERE task_id = ? AND state = 'claimed'").run(taskId);
      this.#database
        .prepare(`INSERT INTO events (operation_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?)`)
        .run(`${leaseId}:provision_failed`, "worktree.provision_failed", JSON.stringify({ taskId }), new Date().toISOString());
    });
    operation.immediate();
  }

  heartbeatOnce(input: HeartbeatInput, heartbeatAt: string, expiresAt: string): HeartbeatResult {
    const operation = this.#database.transaction(() => {
      const previous = this.getOperation<HeartbeatResult>(input.operationId, "lease.heartbeat");
      if (previous) {
        return previous;
      }
      const update = this.#database
        .prepare(
          `UPDATE leases SET heartbeat_at = ?, expires_at = ?
           WHERE lease_id = ? AND task_id = ? AND session_id = ? AND lease_epoch = ?
             AND active = 1 AND expires_at > ?`,
        )
        .run(
          heartbeatAt,
          expiresAt,
          input.leaseId,
          input.taskId,
          input.sessionId,
          input.leaseEpoch,
          heartbeatAt,
        );
      if (update.changes !== 1) {
        throw new Error("Stale or expired lease");
      }
      const result: HeartbeatResult = {
        taskId: input.taskId,
        leaseId: input.leaseId,
        leaseEpoch: input.leaseEpoch,
        expiresAt,
      };
      const resultJson = JSON.stringify(result);
      this.#database
        .prepare("INSERT INTO operations (operation_id, command_type, result_json) VALUES (?, ?, ?)")
        .run(input.operationId, "lease.heartbeat", resultJson);
      this.#database
        .prepare(`INSERT INTO events (operation_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?)`)
        .run(input.operationId, "lease.renewed", resultJson, heartbeatAt);
      return result;
    });
    return operation.immediate();
  }

  listExpiredActiveLeases(now: string): Array<{
    taskId: string;
    leaseId: string;
    leaseEpoch: number;
    worktreePath: string;
  }> {
    return this.#database
      .prepare<[string], { task_id: string; lease_id: string; lease_epoch: number; worktree_path: string }>(
        `SELECT task_id, lease_id, lease_epoch, worktree_path
         FROM leases WHERE active = 1 AND expires_at <= ? ORDER BY expires_at, lease_id`,
      )
      .all(now)
      .map((lease) => ({
        taskId: lease.task_id,
        leaseId: lease.lease_id,
        leaseEpoch: lease.lease_epoch,
        worktreePath: lease.worktree_path,
      }));
  }

  recoverExpiredLease(input: {
    taskId: string;
    leaseId: string;
    leaseEpoch: number;
    now: string;
    kind: ExpiredLeaseRecovery["kind"];
    reason?: ExpiredLeaseRecovery["reason"];
  }): ExpiredLeaseRecovery | undefined {
    const operation = this.#database.transaction(() => {
      const expired = this.#database
        .prepare(
          `UPDATE leases SET active = 0, revoked_reason = 'expired'
           WHERE lease_id = ? AND task_id = ? AND lease_epoch = ?
             AND active = 1 AND expires_at <= ?`,
        )
        .run(input.leaseId, input.taskId, input.leaseEpoch, input.now);
      if (expired.changes !== 1) {
        return undefined;
      }
      const state = input.kind === "requeued" ? "unclaimed" : "blocked";
      const transition = this.#database
        .prepare("UPDATE tasks SET state = ? WHERE task_id = ? AND state = 'in_progress'")
        .run(state, input.taskId);
      if (transition.changes !== 1) {
        throw new Error(`Expired lease ${input.leaseId} no longer owns task ${input.taskId}`);
      }
      const result: ExpiredLeaseRecovery = {
        taskId: input.taskId,
        leaseId: input.leaseId,
        leaseEpoch: input.leaseEpoch,
        kind: input.kind,
        ...(input.reason ? { reason: input.reason } : {}),
      };
      const eventType = input.kind === "requeued" ? "task.requeued_after_lease_expiry" : "task.blocked_after_lease_expiry";
      this.#database
        .prepare(`INSERT INTO events (operation_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?)`)
        .run(`${input.leaseId}:expired`, eventType, JSON.stringify(result), input.now);
      return result;
    });
    return operation.immediate();
  }

  private areDependenciesSatisfied(taskId: string): boolean {
    const task = this.getTask(taskId);
    return task?.dependencies.every((dependencyId) => this.getTask(dependencyId)?.state === "merged") ?? false;
  }

  close(): void {
    this.#database.close();
  }
}
