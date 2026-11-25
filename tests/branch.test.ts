import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultBranch } from "../src/branch.ts";
import { resolveOptions } from "../src/options.ts";

let dir: string;
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: dir, stdio: "ignore" });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "folio-branch-"));
  // No CI event unless a test writes one.
  vi.stubEnv("GITHUB_EVENT_PATH", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

describe("defaultBranch", () => {
  it("reads the branch origin/HEAD points at", () => {
    git("init", "-q");
    git(
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
      "refs/remotes/origin/trunk",
    );
    expect(defaultBranch(dir)).toBe("trunk");
  });

  it("reads the default branch from a GitHub Actions event", () => {
    const event = join(dir, "event.json");
    writeFileSync(
      event,
      JSON.stringify({ repository: { default_branch: "main" } }),
    );
    vi.stubEnv("GITHUB_EVENT_PATH", event);
    expect(defaultBranch(dir)).toBe("main");
  });

  it("is unknown outside a repository and outside CI", () => {
    expect(defaultBranch(dir)).toBeUndefined();
  });
});

describe("the branch Edit this page opens", () => {
  it("is the detected branch, unless the option names one", () => {
    expect(resolveOptions({}, {}, { branch: "trunk" }).branch).toBe("trunk");
    expect(
      resolveOptions({ branch: "docs" }, {}, { branch: "trunk" }).branch,
    ).toBe("docs");
    expect(resolveOptions({}, {}).branch).toBe("master");
  });
});
