import { describe, expect, it } from "vitest";
import { parseServeOptions } from "../src/cli-options.js";

describe("AgentBus CLI options", () => {
  it("accepts an explicit project configuration path", () => {
    expect(parseServeOptions(["serve", "--repo", "/repo", "--config", "/repo/agentbus.toml"])).toEqual({
      repositoryPath: "/repo",
      configPath: "/repo/agentbus.toml",
    });
  });
});
