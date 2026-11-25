import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function originHead(root: string): string | undefined {
  try {
    const ref = execFileSync(
      "git",
      ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return ref.replace(/^origin\//, "") || undefined;
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

/** The default branch of the repository that holds `root`, when git or CI names it. */
export function defaultBranch(root: string): string | undefined {
  return originHead(root) ?? actionsDefaultBranch();
}
