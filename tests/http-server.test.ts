import { afterEach, describe, expect, it } from "vitest";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { assertSupportedPlatform, startAgentBusServer } from "../src/http/server.js";
import { createGitRepository, removeGitRepository } from "./support/git-repository.js";

const repositories: string[] = [];
const servers: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  await Promise.all(repositories.splice(0).map(removeGitRepository));
});

describe("AgentBus HTTP server", () => {
  it("rejects Windows with an actionable unsupported-platform error", () => {
    expect(() => assertSupportedPlatform("win32")).toThrow("Windows is not supported by the AgentBus MVP");
  });

  it("serves health only from a loopback listener for a Git repository", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const server = await startAgentBusServer({ repositoryPath, port: 0 });
    servers.push(server);

    const response = await fetch(`${server.url}/health`);

    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:/);
  });

  it("rejects a nested directory instead of silently binding the enclosing repository", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const nestedPath = join(repositoryPath, "nested");
    await mkdir(nestedPath);

    await expect(startAgentBusServer({ repositoryPath: nestedPath, port: 0 })).rejects.toThrow(
      `must be the Git repository root: ${repositoryPath}`,
    );
  });

  it("delegates session registration through the loopback JSON command boundary", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const server = await startAgentBusServer({ repositoryPath, port: 0 });
    servers.push(server);

    const response = await fetch(`${server.url}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationId: "http-register-worker",
        agentId: "codex-worker",
        profile: "worker-profile",
        roles: ["worker"],
        capabilities: ["task.implement"],
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      agentId: "codex-worker",
      roles: ["worker"],
    });
  });

  it("creates and returns one task context through the loopback JSON command boundary", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const server = await startAgentBusServer({ repositoryPath, port: 0 });
    servers.push(server);
    const registration = await fetch(`${server.url}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationId: "http-task-lead",
        agentId: "lead-agent",
        profile: "lead-profile",
        roles: ["lead"],
        capabilities: ["task.create"],
      }),
    });
    const lead = await registration.json() as { sessionId: string };

    const created = await fetch(`${server.url}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationId: "http-create-task",
        actorSessionId: lead.sessionId,
        title: "HTTP task",
        objective: "Create through the daemon.",
        context: "Return the task alone, never the full board.",
        acceptanceCriteria: ["Task persists"],
        expectedFileScope: ["src/http-task.ts"],
        dependencies: [],
        eligibleRole: "worker",
      }),
    });
    expect(created.status).toBe(201);
    const task = await created.json() as { taskId: string };

    const context = await fetch(`${server.url}/tasks/${task.taskId}`);
    expect(context.status).toBe(200);
    await expect(context.json()).resolves.toMatchObject({
      taskId: task.taskId,
      title: "HTTP task",
      state: "unclaimed",
    });
  });

  it("claims a task through the loopback command boundary", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const server = await startAgentBusServer({ repositoryPath, port: 0 });
    servers.push(server);
    const register = async (operationId: string, roles: string[]) => {
      const response = await fetch(`${server.url}/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operationId,
          agentId: operationId,
          profile: `${roles[0]}-profile`,
          roles,
          capabilities: ["task.implement"],
        }),
      });
      return await response.json() as { sessionId: string };
    };
    const lead = await register("http-claim-lead", ["lead"]);
    const worker = await register("http-claim-worker", ["worker"]);
    const create = await fetch(`${server.url}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationId: "http-claim-task",
        actorSessionId: lead.sessionId,
        title: "HTTP claim",
        objective: "Claim through the daemon.",
        context: "The command returns a core-created worktree.",
        acceptanceCriteria: ["Worker obtains a lease"],
        expectedFileScope: ["src/http-claim.ts"],
        dependencies: [],
        eligibleRole: "worker",
      }),
    });
    const task = await create.json() as { taskId: string };

    const claim = await fetch(`${server.url}/tasks/${task.taskId}/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operationId: "http-claim", sessionId: worker.sessionId }),
    });

    expect(claim.status).toBe(200);
    await expect(claim.json()).resolves.toMatchObject({
      kind: "claimed",
      taskId: task.taskId,
      leaseEpoch: 1,
    });
  });

  it("renews a claimed task through the loopback command boundary", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const server = await startAgentBusServer({ repositoryPath, port: 0 });
    servers.push(server);
    const register = async (operationId: string, roles: string[]) => {
      const response = await fetch(`${server.url}/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operationId,
          agentId: operationId,
          profile: `${roles[0]}-profile`,
          roles,
          capabilities: ["task.implement"],
        }),
      });
      return await response.json() as { sessionId: string };
    };
    const lead = await register("http-heartbeat-lead", ["lead"]);
    const worker = await register("http-heartbeat-worker", ["worker"]);
    const create = await fetch(`${server.url}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationId: "http-heartbeat-task",
        actorSessionId: lead.sessionId,
        title: "HTTP heartbeat",
        objective: "Renew through the daemon.",
        context: "The exact lease fence is required.",
        acceptanceCriteria: ["Worker renews its lease"],
        expectedFileScope: ["src/http-heartbeat.ts"],
        dependencies: [],
        eligibleRole: "worker",
      }),
    });
    const task = await create.json() as { taskId: string };
    const claimResponse = await fetch(`${server.url}/tasks/${task.taskId}/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operationId: "http-heartbeat-claim", sessionId: worker.sessionId }),
    });
    const claim = await claimResponse.json() as { leaseId: string; leaseEpoch: number };

    const heartbeat = await fetch(`${server.url}/tasks/${task.taskId}/heartbeat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationId: "http-heartbeat",
        sessionId: worker.sessionId,
        leaseId: claim.leaseId,
        leaseEpoch: claim.leaseEpoch,
      }),
    });

    expect(heartbeat.status).toBe(200);
    await expect(heartbeat.json()).resolves.toMatchObject({
      taskId: task.taskId,
      leaseId: claim.leaseId,
      leaseEpoch: claim.leaseEpoch,
    });
  });
});
