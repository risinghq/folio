import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { folio } from "../src/index.ts";

const root = fileURLToPath(new URL("fixture", import.meta.url));
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "folio-islands-"));
  writeFileSync(join(dir, "README.md"), "# Manual\n\n- [Demo](demo.md)\n");
  writeFileSync(join(dir, "counter.ts"), "export default () => null;\n");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Builds a manual whose one page places `names`, with `islands` as its islands module. */
function buildWith(names: string[], islands?: string) {
  const markers = names.map((name) => `<!-- island ${name} -->`).join("\n\n");
  writeFileSync(join(dir, "demo.md"), `# Demo\n\nText.\n\n${markers}\n`);
  if (islands !== undefined) writeFileSync(join(dir, "islands.ts"), islands);
  return build({
    root,
    configFile: false,
    logLevel: "silent",
    build: { outDir: join(dir, "out"), emptyOutDir: true },
    plugins: [
      folio({
        title: "Islands",
        docs: relative(root, dir),
        islands: islands === undefined ? undefined : join(dir, "islands.ts"),
      }),
    ],
  });
}

const counter = `export default { counter: () => import("./counter.ts") };\n`;

describe("an island the islands module lacks", () => {
  it("fails the build, naming the page and the island", async () => {
    await expect(buildWith(["counter", "chart"], counter)).rejects.toThrow(
      /demo\.md: .*islands\.ts does not export chart$/m,
    );
  });

  it("fails the build when no islands module is set", async () => {
    await expect(buildWith(["counter"])).rejects.toThrow(
      /demo\.md: no islands option is set for counter/,
    );
  });

  it("builds when the module exports every placed island", async () => {
    await expect(buildWith(["counter"], counter)).resolves.toBeDefined();
  });

  it("reads the names from a constant the module exports", async () => {
    const named = `const islands = { "counter": () => import("./counter.ts") };\nexport default islands;\n`;
    await expect(buildWith(["chart"], named)).rejects.toThrow(
      /does not export chart/,
    );
    await expect(buildWith(["counter"], named)).resolves.toBeDefined();
  });

  it("is left to the browser when the names are only known at run time", async () => {
    const spread = `const more = {};\nexport default { ...more, counter: () => import("./counter.ts") };\n`;
    await expect(buildWith(["chart"], spread)).resolves.toBeDefined();
  });
});
