import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface AgentBusConfig {
  integrationBranch: string;
  leaseDurationMs: number;
  worktreeRoot?: string;
}

const defaults: AgentBusConfig = {
  integrationBranch: "main",
  leaseDurationMs: 15 * 60_000,
};

export async function loadAgentBusConfig(input: {
  repositoryPath: string;
  configPath?: string;
}): Promise<AgentBusConfig> {
  if (!input.configPath) return defaults;
  const source = await readFile(input.configPath, "utf8");
  const values = new Map<string, string>();
  for (const [index, rawLine] of source.split("\n").entries()) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line || line.startsWith("[")) continue;
    const match = /^(integration_branch|lease_seconds|worktree_root)\s*=\s*(.+)$/.exec(line);
    if (!match) {
      throw new Error(`Invalid AgentBus config at line ${index + 1}`);
    }
    values.set(match[1]!, match[2]!.trim());
  }

  const integrationBranch = parseQuoted(values.get("integration_branch"), "integration_branch") ?? defaults.integrationBranch;
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(integrationBranch)) {
    throw new Error("integration_branch must be a valid Git ref fragment");
  }
  const leaseSeconds = values.get("lease_seconds");
  const leaseDurationMs = leaseSeconds === undefined ? defaults.leaseDurationMs : parsePositiveInteger(leaseSeconds, "lease_seconds") * 1_000;
  const configuredRoot = parseQuoted(values.get("worktree_root"), "worktree_root");
  return {
    integrationBranch,
    leaseDurationMs,
    ...(configuredRoot === undefined ? {} : { worktreeRoot: resolve(input.repositoryPath, configuredRoot) }),
  };
}

function parseQuoted(value: string | undefined, key: string): string | undefined {
  if (value === undefined) return undefined;
  const match = /^"([^"\\]*)"$/.exec(value);
  if (!match || !match[1] || match[1].length === 0) throw new Error(`${key} must be a non-empty quoted string`);
  return match[1];
}

function parsePositiveInteger(value: string, key: string): number {
  if (!/^\d+$/.test(value) || Number(value) < 1) throw new Error(`${key} must be a positive integer`);
  return Number(value);
}
