import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("AgentBus CLI", () => {
  it("is directly executable when emitted as the package bin", async () => {
    const source = await readFile(new URL("../src/cli.ts", import.meta.url), "utf8");

    expect(source.startsWith("#!/usr/bin/env node\n")).toBe(true);
  });
});
