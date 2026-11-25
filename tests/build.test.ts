import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { folio } from "../src/index.ts";

const root = fileURLToPath(new URL("fixture", import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), "folio-build-"));
const read = (file: string) => readFileSync(join(outDir, file), "utf8");

beforeAll(async () => {
  await build({
    root,
    base: "/site/",
    logLevel: "silent",
    build: { outDir, emptyOutDir: true },
    plugins: [
      folio({
        title: "Fixture",
        repository: "https://github.com/o/r",
        islands: "src/islands.ts",
        landing: "counter",
      }),
    ],
  });
}, 60_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("build", () => {
  it("writes every route as static HTML", () => {
    for (const file of [
      "index.html",
      "404.html",
      "docs/getting-started/index.html",
      "docs/getting-started.html",
      "docs/create-thing/index.html",
    ]) {
      expect(read(file)).toMatch(/^<!doctype html>/);
    }
  });

  it("renders the page into the HTML with the sidebar, TOC and pager", () => {
    const html = read("docs/getting-started/index.html");
    expect(html).toContain("<title>Getting started · Fixture</title>");
    expect(html).toContain(
      '<a href="/site/docs/getting-started" aria-current="page">',
    );
    expect(html).toContain('<a href="#options-1">Options</a>');
    expect(html).toContain('rel="next"');
    expect(html).toContain(
      "https://github.com/o/r/edit/master/docs/getting-started.md",
    );
  });

  it("links the built script and stylesheet under the base", () => {
    const html = read("index.html");
    const script =
      /<script type="module" src="\/site\/(assets\/[^"]+\.js)">/.exec(
        html,
      )?.[1];
    const style =
      /<link rel="stylesheet" href="\/site\/(assets\/[^"]+\.css)">/.exec(
        html,
      )?.[1];
    expect(script && readdirSync(join(outDir, "assets"))).toContain(
      script?.slice(7),
    );
    expect(style && read(style)).toContain("--accent");
    expect(html).toContain('data-island="counter" data-eager');
  });
});
