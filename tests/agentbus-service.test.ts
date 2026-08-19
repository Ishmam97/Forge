import { afterEach, describe, expect, it } from "vitest";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createAgentBusService } from "../src/core/agentbus-service.js";
import { createGitRepository, removeGitRepository } from "./support/git-repository.js";

const repositories: string[] = [];

afterEach(async () => {
  await Promise.all(repositories.splice(0).map(removeGitRepository));
});

describe("AgentBusService", () => {
  it("persists distinct sessions for concurrent sessions sharing a profile", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const service = await createAgentBusService({ repositoryPath });

    const firstWorker = await service.registerSession({
      operationId: "register-worker-1",
      agentId: "codex-worker",
      profile: "worker-profile",
      roles: ["worker"],
      capabilities: ["task.implement"],
    });
    const secondWorker = await service.registerSession({
      operationId: "register-worker-2",
      agentId: "codex-worker",
      profile: "worker-profile",
      roles: ["worker"],
      capabilities: ["task.implement"],
    });

    expect(firstWorker.sessionId).not.toBe(secondWorker.sessionId);
    expect(await service.listSessions()).toMatchObject([
      { sessionId: firstWorker.sessionId, profile: "worker-profile", roles: ["worker"] },
      { sessionId: secondWorker.sessionId, profile: "worker-profile", roles: ["worker"] },
    ]);

    await service.close();
  });

  it("restores registered sessions after reopening repository-local state", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const firstService = await createAgentBusService({ repositoryPath });
    const registered = await firstService.registerSession({
      operationId: "register-for-restart",
      agentId: "lead-agent",
      profile: "lead-profile",
      roles: ["lead", "reviewer"],
      capabilities: ["task.create", "task.review"],
    });
    await firstService.close();

    const secondService = await createAgentBusService({ repositoryPath });

    await expect(secondService.listSessions()).resolves.toEqual([
      expect.objectContaining({ sessionId: registered.sessionId, agentId: "lead-agent" }),
    ]);

    await secondService.close();
  });

  it("replays a registration result instead of applying an operation twice", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const service = await createAgentBusService({ repositoryPath });
    const input = {
      operationId: "register-idempotently",
      agentId: "worker-agent",
      profile: "worker-profile",
      roles: ["worker"] as const,
      capabilities: ["task.implement"],
    };

    const first = await service.registerSession(input);
    const retried = await service.registerSession(input);

    expect(retried).toEqual(first);
    await expect(service.listSessions()).resolves.toHaveLength(1);

    await service.close();
  });

  it("rejects an operation identifier reused by a different command type", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const service = await createAgentBusService({ repositoryPath });
    const lead = await service.registerSession({
      operationId: "cross-command-operation",
      agentId: "lead-agent",
      profile: "lead-profile",
      roles: ["lead"],
      capabilities: ["task.create"],
    });

    await expect(service.createTask({
      operationId: "cross-command-operation",
      actorSessionId: lead.sessionId,
      title: "Conflicting operation",
      objective: "Reject reuse.",
      context: "Operation IDs are command-scoped.",
      acceptanceCriteria: ["Throws conflict"],
      expectedFileScope: ["src/conflict.ts"],
      dependencies: [],
      eligibleRole: "worker",
    })).rejects.toThrow("belongs to session.register, not task.create");

    await service.close();
  });

  it("creates a self-contained unclaimed Worker task", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const service = await createAgentBusService({ repositoryPath });
    const lead = await service.registerSession({
      operationId: "register-task-lead",
      agentId: "lead-agent",
      profile: "lead-profile",
      roles: ["lead"],
      capabilities: ["task.create"],
    });

    const task = await service.createTask({
      operationId: "create-task",
      actorSessionId: lead.sessionId,
      title: "Add greeting",
      objective: "Add the greeting helper.",
      context: "The helper belongs in src/greeting.ts.",
      acceptanceCriteria: ["Exports greet(name)"],
      expectedFileScope: ["src/greeting.ts"],
      dependencies: [],
      eligibleRole: "worker",
    });

    expect(task).toMatchObject({
      title: "Add greeting",
      state: "unclaimed",
      eligibleRole: "worker",
      dependencies: [],
    });
    await expect(service.getTaskContext(task.taskId)).resolves.toMatchObject(task);

    await service.close();
  });

  it("gives exactly one concurrent Worker a fenced lease and core-created worktree", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const service = await createAgentBusService({ repositoryPath });
    const lead = await service.registerSession({
      operationId: "claim-lead",
      agentId: "lead-agent",
      profile: "lead-profile",
      roles: ["lead"],
      capabilities: ["task.create"],
    });
    const workers = await Promise.all(["first", "second"].map((suffix) => service.registerSession({
      operationId: `claim-worker-${suffix}`,
      agentId: `worker-${suffix}`,
      profile: "worker-profile",
      roles: ["worker"],
      capabilities: ["task.implement"],
    })));
    const task = await service.createTask({
      operationId: "claim-task",
      actorSessionId: lead.sessionId,
      title: "Claim me once",
      objective: "Prove atomic claims.",
      context: "Use the isolated worktree.",
      acceptanceCriteria: ["Exactly one lease"],
      expectedFileScope: ["src/claim.ts"],
      dependencies: [],
      eligibleRole: "worker",
    });

    const claims = await Promise.all(workers.map((worker, index) => service.claimTask({
      operationId: `claim-race-${index}`,
      sessionId: worker.sessionId,
      taskId: task.taskId,
    })));
    const winners = claims.filter((claim) => claim.kind === "claimed");

    expect(winners).toHaveLength(1);
    const winner = winners[0];
    expect(winner).toMatchObject({ kind: "claimed", taskId: task.taskId, leaseEpoch: 1 });
    if (winner?.kind === "claimed") {
      await expect(access(winner.worktreePath)).resolves.toBeUndefined();
    }
    expect(claims.filter((claim) => claim.kind === "not_claimable")).toHaveLength(1);

    await service.close();
  });

  it("replays a successful claim when its operation is retried", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const service = await createAgentBusService({ repositoryPath });
    const lead = await service.registerSession({
      operationId: "claim-replay-lead",
      agentId: "lead-agent",
      profile: "lead-profile",
      roles: ["lead"],
      capabilities: ["task.create"],
    });
    const worker = await service.registerSession({
      operationId: "claim-replay-worker",
      agentId: "worker-agent",
      profile: "worker-profile",
      roles: ["worker"],
      capabilities: ["task.implement"],
    });
    const task = await service.createTask({
      operationId: "claim-replay-task",
      actorSessionId: lead.sessionId,
      title: "Replay claim",
      objective: "Claim once.",
      context: "Use its worktree.",
      acceptanceCriteria: ["Claim returns the same lease"],
      expectedFileScope: ["src/replay.ts"],
      dependencies: [],
      eligibleRole: "worker",
    });
    const input = {
      operationId: "claim-replay-operation",
      sessionId: worker.sessionId,
      taskId: task.taskId,
    };

    const first = await service.claimTask(input);
    const retried = await service.claimTask(input);

    expect(retried).toEqual(first);
    expect(first).toMatchObject({ kind: "claimed" });

    await service.close();
  });

  it("does not allow a Worker to claim a task with an unfinished dependency", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const service = await createAgentBusService({ repositoryPath });
    const lead = await service.registerSession({
      operationId: "dependency-lead",
      agentId: "lead-agent",
      profile: "lead-profile",
      roles: ["lead"],
      capabilities: ["task.create"],
    });
    const worker = await service.registerSession({
      operationId: "dependency-worker",
      agentId: "worker-agent",
      profile: "worker-profile",
      roles: ["worker"],
      capabilities: ["task.implement"],
    });
    const prerequisite = await service.createTask({
      operationId: "dependency-prerequisite",
      actorSessionId: lead.sessionId,
      title: "Prerequisite",
      objective: "Finish first.",
      context: "This must complete before dependent work.",
      acceptanceCriteria: ["Prerequisite exists"],
      expectedFileScope: ["src/prerequisite.ts"],
      dependencies: [],
      eligibleRole: "worker",
    });
    const dependent = await service.createTask({
      operationId: "dependency-dependent",
      actorSessionId: lead.sessionId,
      title: "Dependent",
      objective: "Wait for prerequisite.",
      context: "This cannot start yet.",
      acceptanceCriteria: ["Waits"],
      expectedFileScope: ["src/dependent.ts"],
      dependencies: [prerequisite.taskId],
      eligibleRole: "worker",
    });

    await expect(service.claimTask({
      operationId: "dependency-claim",
      sessionId: worker.sessionId,
      taskId: dependent.taskId,
    })).resolves.toEqual({ kind: "not_claimable", taskId: dependent.taskId });

    await service.close();
  });

  it("renews only the current active lease and rejects a stale or expired fence", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    let currentTime = new Date("2026-08-13T12:00:00.000Z");
    const service = await createAgentBusService({
      repositoryPath,
      leaseDurationMs: 60_000,
      now: () => currentTime,
    });
    const lead = await service.registerSession({
      operationId: "heartbeat-lead",
      agentId: "lead-agent",
      profile: "lead-profile",
      roles: ["lead"],
      capabilities: ["task.create"],
    });
    const worker = await service.registerSession({
      operationId: "heartbeat-worker",
      agentId: "worker-agent",
      profile: "worker-profile",
      roles: ["worker"],
      capabilities: ["task.implement"],
    });
    const task = await service.createTask({
      operationId: "heartbeat-task",
      actorSessionId: lead.sessionId,
      title: "Renew lease",
      objective: "Prove fence renewal.",
      context: "The current fence alone may extend the lease.",
      acceptanceCriteria: ["A heartbeat extends the current lease"],
      expectedFileScope: ["src/lease.ts"],
      dependencies: [],
      eligibleRole: "worker",
    });
    const claim = await service.claimTask({
      operationId: "heartbeat-claim",
      sessionId: worker.sessionId,
      taskId: task.taskId,
    });
    expect(claim).toMatchObject({ kind: "claimed" });
    if (claim.kind !== "claimed") throw new Error("claim should succeed");

    currentTime = new Date("2026-08-13T12:00:30.000Z");
    await expect(service.heartbeat({
      operationId: "heartbeat-current",
      sessionId: worker.sessionId,
      taskId: task.taskId,
      leaseId: claim.leaseId,
      leaseEpoch: claim.leaseEpoch,
    })).resolves.toMatchObject({
      taskId: task.taskId,
      leaseId: claim.leaseId,
      leaseEpoch: claim.leaseEpoch,
      expiresAt: "2026-08-13T12:01:30.000Z",
    });

    await expect(service.heartbeat({
      operationId: "heartbeat-stale",
      sessionId: worker.sessionId,
      taskId: task.taskId,
      leaseId: claim.leaseId,
      leaseEpoch: claim.leaseEpoch + 1,
    })).rejects.toThrow("Stale or expired lease");

    currentTime = new Date("2026-08-13T12:01:31.000Z");
    await expect(service.heartbeat({
      operationId: "heartbeat-expired",
      sessionId: worker.sessionId,
      taskId: task.taskId,
      leaseId: claim.leaseId,
      leaseEpoch: claim.leaseEpoch,
    })).rejects.toThrow("Stale or expired lease");

    await service.close();
  });

  it("requeues an expired lease when its core-created worktree is clean", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    let currentTime = new Date("2026-08-13T12:00:00.000Z");
    const service = await createAgentBusService({
      repositoryPath,
      leaseDurationMs: 60_000,
      now: () => currentTime,
    });
    const lead = await service.registerSession({
      operationId: "expiry-clean-lead",
      agentId: "lead-agent",
      profile: "lead-profile",
      roles: ["lead"],
      capabilities: ["task.create"],
    });
    const worker = await service.registerSession({
      operationId: "expiry-clean-worker",
      agentId: "worker-agent",
      profile: "worker-profile",
      roles: ["worker"],
      capabilities: ["task.implement"],
    });
    const task = await service.createTask({
      operationId: "expiry-clean-task",
      actorSessionId: lead.sessionId,
      title: "Recover clean worktree",
      objective: "Requeue clean expired work.",
      context: "The core checks the isolated worktree after expiry.",
      acceptanceCriteria: ["Clean work requeues"],
      expectedFileScope: ["src/recovery.ts"],
      dependencies: [],
      eligibleRole: "worker",
    });
    const claim = await service.claimTask({
      operationId: "expiry-clean-claim",
      sessionId: worker.sessionId,
      taskId: task.taskId,
    });
    expect(claim).toMatchObject({ kind: "claimed" });

    currentTime = new Date("2026-08-13T12:01:01.000Z");
    await expect(service.reconcileExpiredLeases()).resolves.toEqual([
      expect.objectContaining({ taskId: task.taskId, kind: "requeued" }),
    ]);
    await expect(service.getTaskContext(task.taskId)).resolves.toMatchObject({ state: "unclaimed" });

    await service.close();
  });

  it("blocks an expired lease when its core-created worktree is dirty", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    let currentTime = new Date("2026-08-13T12:00:00.000Z");
    const service = await createAgentBusService({
      repositoryPath,
      leaseDurationMs: 60_000,
      now: () => currentTime,
    });
    const lead = await service.registerSession({
      operationId: "expiry-dirty-lead",
      agentId: "lead-agent",
      profile: "lead-profile",
      roles: ["lead"],
      capabilities: ["task.create"],
    });
    const worker = await service.registerSession({
      operationId: "expiry-dirty-worker",
      agentId: "worker-agent",
      profile: "worker-profile",
      roles: ["worker"],
      capabilities: ["task.implement"],
    });
    const task = await service.createTask({
      operationId: "expiry-dirty-task",
      actorSessionId: lead.sessionId,
      title: "Preserve dirty worktree",
      objective: "Block dirty expired work.",
      context: "The human must decide how to recover uncommitted changes.",
      acceptanceCriteria: ["Dirty work blocks"],
      expectedFileScope: ["src/recovery.ts"],
      dependencies: [],
      eligibleRole: "worker",
    });
    const claim = await service.claimTask({
      operationId: "expiry-dirty-claim",
      sessionId: worker.sessionId,
      taskId: task.taskId,
    });
    expect(claim).toMatchObject({ kind: "claimed" });
    if (claim.kind !== "claimed") throw new Error("claim should succeed");
    await writeFile(join(claim.worktreePath, "uncommitted.txt"), "preserve me");

    currentTime = new Date("2026-08-13T12:01:01.000Z");
    await expect(service.reconcileExpiredLeases()).resolves.toEqual([
      expect.objectContaining({ taskId: task.taskId, kind: "blocked" }),
    ]);
    await expect(service.getTaskContext(task.taskId)).resolves.toMatchObject({ state: "blocked" });
    await expect(access(join(claim.worktreePath, "uncommitted.txt"))).resolves.toBeUndefined();

    await service.close();
  });

  it("preserves an active lease fence across a repository-local restart", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    let currentTime = new Date("2026-08-19T12:00:00.000Z");
    const firstService = await createAgentBusService({
      repositoryPath,
      leaseDurationMs: 60_000,
      now: () => currentTime,
    });
    const lead = await firstService.registerSession({
      operationId: "restart-lease-lead",
      agentId: "lead-agent",
      profile: "lead-profile",
      roles: ["lead"],
      capabilities: ["task.create"],
    });
    const worker = await firstService.registerSession({
      operationId: "restart-lease-worker",
      agentId: "worker-agent",
      profile: "worker-profile",
      roles: ["worker"],
      capabilities: ["task.implement"],
    });
    const task = await firstService.createTask({
      operationId: "restart-lease-task",
      actorSessionId: lead.sessionId,
      title: "Persist active lease",
      objective: "Retain the fence after a restart.",
      context: "The reopened database must preserve active lease metadata.",
      acceptanceCriteria: ["The active lease renews after restart"],
      expectedFileScope: ["src/restart.ts"],
      dependencies: [],
      eligibleRole: "worker",
    });
    const claim = await firstService.claimTask({
      operationId: "restart-lease-claim",
      sessionId: worker.sessionId,
      taskId: task.taskId,
    });
    expect(claim).toMatchObject({ kind: "claimed" });
    if (claim.kind !== "claimed") throw new Error("claim should succeed");
    await firstService.close();

    currentTime = new Date("2026-08-19T12:00:30.000Z");
    const secondService = await createAgentBusService({
      repositoryPath,
      leaseDurationMs: 60_000,
      now: () => currentTime,
    });

    await expect(secondService.heartbeat({
      operationId: "restart-lease-heartbeat",
      sessionId: worker.sessionId,
      taskId: task.taskId,
      leaseId: claim.leaseId,
      leaseEpoch: claim.leaseEpoch,
    })).resolves.toMatchObject({ expiresAt: "2026-08-19T12:01:30.000Z" });

    await secondService.close();
  });
});
