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
  });

  it("renders the docs folder's index.md as the home page", () => {
    const html = read("index.html");
    expect(html).toContain("<h1>Fixture home</h1>");
    expect(html).toContain(
      '<p class="actions"><a class="btn btn-primary" href="/site/docs/getting-started">',
    );
    expect(html).toContain('data-island="counter"');
  });

  it("copies the images a page shows into the build", () => {
    expect(read("index.html")).toContain(
      '<img src="/site/docs/images/shot.svg" alt="The fixture" width="16" height="9" loading="lazy">',
    );
    expect(read("docs/images/shot.svg")).toContain("<svg");
  });

  it("preloads the text fonts before the stylesheet", () => {
    const html = read("index.html");
    expect(html).toMatch(
      /<link rel="preload" href="\/site\/assets\/geist-latin-wght-normal-[\w-]+\.woff2" as="font" type="font\/woff2" crossorigin>/,
    );
    const preload = html.indexOf('rel="preload"');
    expect(preload).toBeLessThan(html.indexOf('rel="stylesheet"'));
  });

  it("caches every hashed asset for a year and no page", () => {
    const [pattern, header] = read("_headers").trim().split(/\n\s+/);
    expect(header).toMatch(/max-age=31536000, immutable/);
    const covers = (file: string) =>
      `/site/${file}`.startsWith(pattern!.replace(/\*$/, ""));
    const assets = readdirSync(join(outDir, "assets"));
    expect(assets.length).toBeGreaterThan(0);
    for (const file of assets) expect(covers(`assets/${file}`)).toBe(true);
    for (const page of ["index.html", "docs/getting-started.html"])
      expect(covers(page)).toBe(false);
  });
});
