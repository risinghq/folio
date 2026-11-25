import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultBranch, readCheckout } from "../src/checkout.ts";
import { repositoryFileUrl, resolveOptions } from "../src/options.ts";
import { siteOptions } from "../src/plugin.ts";

let dir: string;
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: dir, stdio: "ignore" });
const write = (file: string, content: string) => {
  mkdirSync(join(dir, file, ".."), { recursive: true });
  writeFileSync(join(dir, file), content);
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "folio-checkout-"));
  // No CI context unless a test sets one.
  vi.stubEnv("GITHUB_EVENT_PATH", "");
  vi.stubEnv("GITHUB_REPOSITORY", "");
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

describe("readCheckout", () => {
  it("finds a nested docs folder's path and the origin's web address", () => {
    git("init", "-q");
    git("remote", "add", "origin", "git@github.com:o/mono.git");
    write("packages/thing/docs/README.md", "");
    expect(readCheckout(join(dir, "packages/thing/docs"))).toMatchObject({
      repository: "https://github.com/o/mono",
      docsPath: "packages/thing/docs",
    });
  });

  it("names the repository a GitHub Actions run checked out", () => {
    vi.stubEnv("GITHUB_SERVER_URL", "https://github.com");
    vi.stubEnv("GITHUB_REPOSITORY", "o/r");
    expect(readCheckout(dir).repository).toBe("https://github.com/o/r");
  });

  it("knows nothing outside a repository", () => {
    expect(readCheckout(dir)).toEqual({});
  });
});

describe("an Edit this page link", () => {
  const options = { repository: "https://github.com/o/r", branch: "main" };

  it("opens the page under the docs folder's path", () => {
    expect(
      repositoryFileUrl(
        { ...options, docsPath: "packages/thing/docs" },
        "edit",
        "start.md",
      ),
    ).toBe("https://github.com/o/r/edit/main/packages/thing/docs/start.md");
  });

  it("opens the page at the repository root when the docs live there", () => {
    expect(
      repositoryFileUrl({ ...options, docsPath: "" }, "edit", "start.md"),
    ).toBe("https://github.com/o/r/edit/main/start.md");
  });
});

describe("a docs site in a monorepo", () => {
  beforeEach(() => {
    git("init", "-q");
    git("remote", "add", "origin", "https://github.com/o/mono.git");
    write(
      "packages/thing/package.json",
      JSON.stringify({ name: "@o/thing", version: "2.0.0" }),
    );
    write(
      "site/package.json",
      JSON.stringify({
        name: "thing-site",
        private: true,
        folio: { docs: "../docs", package: "../packages/thing" },
      }),
    );
    write("docs/README.md", "");
  });

  it("describes the package its folio field names", () => {
    expect(siteOptions({}, join(dir, "site"))).toMatchObject({
      title: "thing",
      version: "2.0.0",
      npm: "@o/thing",
      repository: "https://github.com/o/mono",
      docsPath: "docs",
    });
  });

  it("describes its own private package with no npm link otherwise", () => {
    const options = siteOptions({ package: "." }, join(dir, "site"));
    expect(options.title).toBe("thing-site");
    expect(options.npm).toBeUndefined();
  });
});

describe("the npm link", () => {
  it("names a public package, or the option's, or none when false", () => {
    expect(resolveOptions({}, { name: "@o/thing" }).npm).toBe("@o/thing");
    expect(
      resolveOptions({}, { name: "x", private: true }).npm,
    ).toBeUndefined();
    expect(resolveOptions({ npm: "other" }, { name: "x" }).npm).toBe("other");
    expect(resolveOptions({ npm: false }, { name: "x" }).npm).toBeUndefined();
  });
});
