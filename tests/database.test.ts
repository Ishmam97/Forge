import { afterEach, describe, expect, it } from "vitest";
import { AgentBusDatabase } from "../src/db/database.js";
import { createGitRepository, removeGitRepository } from "./support/git-repository.js";

const repositories: string[] = [];

afterEach(async () => {
  await Promise.all(repositories.splice(0).map(removeGitRepository));
});

describe("AgentBusDatabase", () => {
  it("persists an acknowledged mutation and its single event across a close and reopen", async () => {
    const repositoryPath = await createGitRepository();
    repositories.push(repositoryPath);
    const first = await AgentBusDatabase.open(repositoryPath);
    first.registerSessionOnce("register-after-ack", {
      sessionId: "session-after-ack",
      agentId: "worker-agent",
      profile: "worker-profile",
      roles: ["worker"],
      capabilities: ["task.implement"],
    });
    first.close();

    const reopened = await AgentBusDatabase.open(repositoryPath);
    expect(reopened.listSessions()).toHaveLength(1);
    expect(reopened.countEvents()).toBe(1);
    expect(reopened.journalMode()).toBe("wal");
    expect(reopened.indexNames()).toEqual(expect.arrayContaining([
      "events_task_id_sequence_idx",
      "leases_active_expiry_idx",
    ]));
    reopened.close();
  });
});
