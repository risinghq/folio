import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { relative, sep } from "node:path";

import { repositoryUrl, type Detected } from "./options.ts";

function git(cwd: string, ...args: string[]): string | undefined {
  try {
    return (
      execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || undefined
    );
  } catch {
    return undefined;
  }
}

/**
 * actions/checkout leaves no `origin/HEAD`, but the event that started the
 * workflow names the repository's default branch.
 */
function actionsDefaultBranch(): string | undefined {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path) return undefined;
  try {
    const event = JSON.parse(readFileSync(path, "utf8")) as {
      repository?: { default_branch?: unknown };
    };
    const branch = event.repository?.default_branch;
    return typeof branch === "string" && branch ? branch : undefined;
  } catch {
    return undefined;
  }
}

function actionsRepository(): string | undefined {
  const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repo } = process.env;
  return server && repo ? `${server}/${repo}` : undefined;
}

/** The default branch of the repository that holds `dir`, when git or CI names it. */
export function defaultBranch(dir: string): string | undefined {
  return (
    git(dir, "symbolic-ref", "--short", "refs/remotes/origin/HEAD")?.replace(
      /^origin\//,
      "",
    ) ?? actionsDefaultBranch()
  );
}

/** What the git checkout that holds the docs folder says about it. */
export function readCheckout(docs: string): Detected {
  const top = git(docs, "rev-parse", "--show-toplevel");
  const path = top
    ? relative(realpathSync(top), realpathSync(docs)).split(sep).join("/")
    : undefined;
  return {
    branch: defaultBranch(docs),
    repository:
      repositoryUrl(git(docs, "remote", "get-url", "origin")) ??
      actionsRepository(),
    docsPath: path,
  };
}
