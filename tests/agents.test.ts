import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Marked, type Token, type Tokens } from "marked";
import { build, createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { folio, markdownPath, prefersMarkdown } from "../src/index.ts";

const root = fileURLToPath(new URL("fixture", import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), "folio-agents-"));
const site = "https://example.com/site/";
const read = (file: string) => readFileSync(join(outDir, file), "utf8");
const plugin = () =>
  folio({
    title: "Fixture",
    description: "Docs for the fixture.",
    url: site,
    repository: "https://github.com/o/r",
    islands: "src/islands.ts",
  });

/** The file a URL of the built site serves, or none outside the site. */
function builtFile(url: string): string | undefined {
  return url.startsWith(site) ? url.slice(site.length) : undefined;
}

function parse(file: string): { meta: Record<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/.exec(file);
  if (!match) throw new Error("no frontmatter");
  const meta = Object.fromEntries(
    (match[1] ?? "").split("\n").map((line) => {
      const at = line.indexOf(": ");
      return [line.slice(0, at), JSON.parse(line.slice(at + 2)) as string];
    }),
  );
  return { meta, body: match[2] ?? "" };
}

/** Every link and image target in a markdown document. */
function targets(markdown: string): string[] {
  const marked = new Marked();
  const found: string[] = [];
  marked.walkTokens(marked.lexer(markdown), (token: Token) => {
    if (token.type === "link" || token.type === "image")
      found.push((token as Tokens.Link).href);
  });
  return found;
}

beforeAll(async () => {
  await build({
    root,
    configFile: false,
    base: "/site/",
    logLevel: "silent",
    build: { outDir, emptyOutDir: true },
    plugins: [plugin()],
  });
}, 60_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("Markdown for agents", () => {
  it("writes each page's markdown with frontmatter that names it", () => {
    const { meta } = parse(read("docs/getting-started.md"));
    expect(meta).toEqual({
      title: "Getting started",
      description: "Install it with npm. See createThing and the changelog.",
      url: `${site}docs/getting-started`,
    });
    expect(parse(read("index.md")).meta.url).toBe(site);
  });

  it("points a page's links at files the site serves", () => {
    const links = targets(parse(read("docs/getting-started.md")).body);
    expect(links).toContain(`${site}docs/create-thing.md#options`);
    expect(links).toContain(
      "https://github.com/o/r/blob/master/docs/changelog.md",
    );
    const missing = links
      .map((link) => builtFile(link.replace(/#.*$/, "")))
      .filter((file) => file !== undefined)
      .filter((file) => !existsSync(join(outDir, file)));
    expect(missing).toEqual([]);
    const image = targets(read("index.md")).find((href) =>
      href.endsWith(".svg"),
    );
    expect(image && existsSync(join(outDir, builtFile(image) ?? ""))).toBe(
      true,
    );
  });

  it("keeps code blocks and replaces an island with a link to the page", () => {
    const body = parse(read("docs/getting-started.md")).body;
    expect(body).toContain("```ts\nconst a = 1;\n```");
    expect(body).not.toContain("island");
    expect(targets(body)).toContain(`${site}docs/getting-started`);
  });

  it("lists every page in llms.txt with its summary", () => {
    const tokens = new Marked().lexer(read("llms.txt"));
    const sections = tokens
      .filter((token): token is Tokens.Heading => token.type === "heading")
      .map((token) => `${token.depth} ${token.text}`);
    expect(sections).toEqual(["1 Fixture", "2 Manual", "2 Optional"]);
    const summary = tokens.find(
      (token): token is Tokens.Blockquote => token.type === "blockquote",
    );
    expect(summary?.text).toBe("Docs for the fixture.");
    const manual = tokens.find((token) => token.type === "list") as Tokens.List;
    expect(manual.items.map((item) => targets(item.raw)[0])).toEqual([
      `${site}docs/getting-started.md`,
      `${site}docs/create-thing.md`,
    ]);
    for (const link of targets(read("llms.txt")))
      expect(existsSync(join(outDir, builtFile(link) ?? ""))).toBe(true);
  });

  it("holds every page in llms-full.txt", () => {
    const titles = new Marked()
      .lexer(read("llms-full.txt"))
      .filter((token): token is Tokens.Heading => token.type === "heading")
      .filter((token) => token.depth === 1)
      .map((token) => token.text);
    expect(titles).toEqual(["Fixture", "Getting started", "`createThing`"]);
  });

  it("links each HTML page to its markdown", () => {
    for (const [html, md] of [
      ["docs/getting-started.html", "docs/getting-started.md"],
      ["index.html", "index.md"],
    ] as const) {
      const href =
        /<link rel="alternate" type="text\/markdown" href="\/site\/([^"]+)">/.exec(
          read(html),
        )?.[1];
      expect(href).toBe(md);
    }
  });
});

describe("prefersMarkdown", () => {
  it.each([
    ["text/markdown", true],
    ["text/markdown, */*", true],
    ["text/x-markdown;q=0.9, text/html;q=0.9", true],
    ["*/*", false],
    ["text/html,application/xhtml+xml,*/*;q=0.8", false],
    ["text/html, text/markdown;q=0.5", false],
    ["text/markdown;q=0", false],
    [undefined, false],
  ])("%s → %s", (accept, expected) => {
    expect(prefersMarkdown(accept)).toBe(expected);
  });
});

describe("markdownPath", () => {
  it.each([
    ["/site/", "/site/index.md"],
    ["/site", "/site/index.md"],
    ["/site/docs/options", "/site/docs/options.md"],
    ["/site/docs/options/", "/site/docs/options.md"],
    ["/site/docs/options.html", "/site/docs/options.md"],
    ["/site/assets/a.js", undefined],
    ["/other/docs/options", undefined],
  ])("%s → %s", (path, expected) => {
    expect(markdownPath(path, "/site/")).toBe(expected);
  });
});

describe("the dev server", () => {
  let server: ViteDevServer;
  let origin: string;

  beforeAll(async () => {
    server = await createServer({
      root,
      configFile: false,
      base: "/site/",
      logLevel: "silent",
      server: { port: 0 },
      plugins: [plugin()],
    });
    await server.listen();
    origin = new URL(server.resolvedUrls?.local[0] ?? "").origin;
  }, 60_000);

  afterAll(() => server?.close());

  it("answers a page with markdown when the request prefers it", async () => {
    const response = await fetch(`${origin}/site/docs/getting-started`, {
      headers: { Accept: "text/markdown" },
    });
    expect(response.headers.get("content-type")).toMatch(/^text\/markdown/);
    expect(response.headers.get("vary")).toBe("Accept");
    expect(parse(await response.text()).meta.title).toBe("Getting started");
  });

  it("answers a browser with HTML", async () => {
    const response = await fetch(`${origin}/site/docs/getting-started`, {
      headers: { Accept: "text/html,*/*;q=0.8" },
    });
    expect(response.headers.get("content-type")).toMatch(/^text\/html/);
  });

  it("serves the tab icon a page links", async () => {
    const page = await (await fetch(`${origin}/site/`)).text();
    const href = /<link rel="icon" href="([^"]+)"/.exec(page)?.[1];
    const response = await fetch(`${origin}${href}`);
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(await response.text()).toMatch(/^<svg /);
  });

  it("serves llms.txt", async () => {
    const response = await fetch(`${origin}/site/llms.txt`);
    expect(response.status).toBe(200);
    expect(targets(await response.text())).toContain(
      `${site}docs/create-thing.md`,
    );
  });
});
