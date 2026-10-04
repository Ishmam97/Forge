import { execFile as execFileCallback } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import Fastify from "fastify";
import { loadAgentBusConfig } from "../config.js";
import { createAgentBusService, type AgentBusService } from "../core/agentbus-service.js";
import { CommandError } from "../domain/errors.js";
import type {
  ClaimTaskInput,
  CreateTaskInput,
  HeartbeatInput,
  RegisterSessionInput,
} from "../domain/types.js";

const execFile = promisify(execFileCallback);

function operationIdFromBody(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("operationId" in body)) {
    return undefined;
  }
  const operationId = (body as { operationId?: unknown }).operationId;
  return typeof operationId === "string" ? operationId : undefined;
}

export interface StartAgentBusServerOptions {
  repositoryPath: string;
  port?: number;
  configPath?: string;
  leaseDurationMs?: number;
  now?: () => Date;
}

export interface StartedAgentBusServer {
  url: string;
  service: AgentBusService;
  close(): Promise<void>;
}

export function assertSupportedPlatform(platform = process.platform): void {
  if (platform === "win32") {
    throw new Error("Windows is not supported by the AgentBus MVP; use Linux or macOS");
  }
}

async function resolveGitRepository(repositoryPath: string): Promise<string> {
  const requestedPath = resolve(repositoryPath);
  const { stdout } = await execFile("git", ["rev-parse", "--show-toplevel"], {
    cwd: requestedPath,
  });
  const rootPath = resolve(stdout.trim());
  if (rootPath !== requestedPath) {
    throw new Error(`AgentBus repository path must be the Git repository root: ${rootPath}`);
  }
  return rootPath;
}

export async function startAgentBusServer(
  options: StartAgentBusServerOptions,
): Promise<StartedAgentBusServer> {
  assertSupportedPlatform();
  let repositoryPath: string;
  try {
    repositoryPath = await resolveGitRepository(options.repositoryPath);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AgentBus repository path")) {
      throw error;
    }
    throw new Error(`Not a Git repository: ${options.repositoryPath}`);
  }
  const service = await createAgentBusService({
    repositoryPath,
    ...(await loadAgentBusConfig({
      repositoryPath,
      ...(options.configPath === undefined ? {} : { configPath: options.configPath }),
    })),
    ...(options.leaseDurationMs === undefined ? {} : { leaseDurationMs: options.leaseDurationMs }),
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => {
    const commandError = error instanceof CommandError ? error : undefined;
    const operationId = operationIdFromBody(request.body);
    const statusCode = commandError?.statusCode ?? 500;
    const code = commandError?.code ?? "INTERNAL_ERROR";
    const message = commandError?.message ?? "Command failed";
    console.warn(JSON.stringify({ operationId, code, message }));
    return reply.code(statusCode).send({
      ...(operationId === undefined ? {} : { operationId }),
      code,
      message,
    });
  });
  app.get("/health", async () => ({ status: "ok" }));
  app.post<{ Body: RegisterSessionInput }>("/sessions", async (request, reply) => {
    const session = await service.registerSession(request.body);
    return reply.code(201).send(session);
  });
  app.post<{ Body: CreateTaskInput }>("/tasks", async (request, reply) => {
    const task = await service.createTask(request.body);
    return reply.code(201).send(task);
  });
  app.get<{ Params: { taskId: string } }>("/tasks/:taskId", async (request, reply) => {
    const detail = await service.getTaskDetail(request.params.taskId);
    if (!detail) {
      return reply.code(404).send({ error: "Task not found" });
    }
    return detail;
  });
  app.post<{
    Params: { taskId: string };
    Body: Omit<ClaimTaskInput, "taskId">;
  }>("/tasks/:taskId/claim", async (request) => {
    return service.claimTask({ ...request.body, taskId: request.params.taskId });
  });
  app.post<{
    Params: { taskId: string };
    Body: Omit<HeartbeatInput, "taskId">;
  }>("/tasks/:taskId/heartbeat", async (request) => {
    return service.heartbeat({ ...request.body, taskId: request.params.taskId });
  });
  app.post("/leases/reconcile-expired", async () => service.reconcileExpiredLeases());
  try {
    const url = await app.listen({ host: "127.0.0.1", port: options.port ?? 0 });
    return {
      url,
      service,
      async close(): Promise<void> {
        await app.close();
        await service.close();
      },
    };
  } catch (error) {
    await service.close();
    throw error;
  }
}
