import { execFile as execFileCallback } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import Fastify from "fastify";
import { createAgentBusService, type AgentBusService } from "../core/agentbus-service.js";
import type {
  ClaimTaskInput,
  CreateTaskInput,
  HeartbeatInput,
  RegisterSessionInput,
} from "../domain/types.js";

const execFile = promisify(execFileCallback);

export interface StartAgentBusServerOptions {
  repositoryPath: string;
  port?: number;
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
  const service = await createAgentBusService({ repositoryPath });
  const app = Fastify({ logger: false });
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
    const task = await service.getTaskContext(request.params.taskId);
    if (!task) {
      return reply.code(404).send({ error: "Task not found" });
    }
    return task;
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
