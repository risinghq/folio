import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { imageSize } from "image-size";
import { JSDOM } from "jsdom";
import { build } from "vite";
import { afterAll, describe, expect, it } from "vitest";

import { folio, type FolioOptions } from "../src/index.ts";
import { manualPage, routesFor } from "../src/layout.ts";
import { resolveOptions } from "../src/options.ts";

const root = fileURLToPath(new URL("fixture", import.meta.url));
const origin = "https://docs.example.com";
const dirs: string[] = [];

async function buildSite(options: FolioOptions, base = "/") {
  const outDir = mkdtempSync(join(tmpdir(), "folio-seo-"));
  dirs.push(outDir);
  await build({
    root,
    base,
    configFile: false,
    logLevel: "silent",
    build: { outDir, emptyOutDir: true },
    plugins: [folio({ title: "Fixture", ...options })],
  });
  return outDir;
}

/** The emitted file a URL on the site serves, as `vite preview` resolves it. */
function servedFile(outDir: string, url: string, base: string): string {
  const path = new URL(url).pathname.slice(base.length);
  for (const file of [path, `${path}.html`, join(path, "index.html")]) {
    const full = join(outDir, file);
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  throw new Error(`nothing serves ${url}`);
}

function head(file: string) {
  const document = new JSDOM(readFileSync(file, "utf8")).window.document;
  const meta = (property: string) =>
    document
      .querySelector(`meta[property="${property}"]`)
      ?.getAttribute("content");
  return {
    canonical: document
      .querySelector('link[rel="canonical"]')
      ?.getAttribute("href"),
    title: meta("og:title"),
    image: meta("og:image"),
    robots: document
      .querySelector('meta[name="robots"]')
      ?.getAttribute("content"),
  };
}

function sitemapUrls(outDir: string): string[] {
  const xml = readFileSync(join(outDir, "sitemap.xml"), "utf8");
  const document = new JSDOM(xml, { contentType: "text/xml" }).window.document;
  return [...document.querySelectorAll("loc")].map((loc) => loc.textContent);
}

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe("a site with an address", () => {
  const base = "/site/";
  let outDir: string;

  it("lists the home page and every manual page in the sitemap", async () => {
    outDir = await buildSite({ url: origin }, base);
    expect(sitemapUrls(outDir)).toEqual([
      `${origin}/site/`,
      `${origin}/site/docs/getting-started`,
      `${origin}/site/docs/create-thing`,
    ]);
  }, 60_000);

  it("gives each listed page itself as canonical and a card that exists", () => {
    for (const url of sitemapUrls(outDir)) {
      const tags = head(servedFile(outDir, url, base));
      expect(tags.canonical).toBe(url);
      const card = servedFile(outDir, tags.image ?? "", base);
      expect(imageSize(readFileSync(card))).toMatchObject({
        type: "png",
        width: 1200,
        height: 630,
      });
    }
  });

  it("draws a different card for each page", () => {
    const cards = sitemapUrls(outDir).map((url) => {
      const image = head(servedFile(outDir, url, base)).image ?? "";
      return readFileSync(servedFile(outDir, image, base)).toString("base64");
    });
    expect(new Set(cards).size).toBe(cards.length);
  });

  it("keeps the 404 page out of search results", () => {
    const tags = head(join(outDir, "404.html"));
    expect(tags.robots).toBe("noindex");
    expect(tags.canonical).toBeUndefined();
  });

  it("writes no robots.txt below the host's root, where crawlers never look", () => {
    expect(existsSync(join(outDir, "robots.txt"))).toBe(false);
  });
});

describe("a site at the host's root", () => {
  it("points robots.txt at the sitemap", async () => {
    const outDir = await buildSite({ url: origin });
    const robots = readFileSync(join(outDir, "robots.txt"), "utf8");
    const sitemap = /^Sitemap: (.+)$/m.exec(robots)?.[1] ?? "";
    expect(servedFile(outDir, sitemap, "/")).toBe(join(outDir, "sitemap.xml"));
  }, 60_000);
});

describe("ogImage", () => {
  it("shares one given image on every page and draws none", async () => {
    const outDir = await buildSite({ url: origin, ogImage: "card.png" });
    const page = head(join(outDir, "docs/getting-started/index.html"));
    expect(page.image).toBe(`${origin}/card.png`);
    expect(head(join(outDir, "index.html")).image).toBe(`${origin}/card.png`);
    expect(existsSync(join(outDir, "og"))).toBe(false);
  }, 60_000);

  it("shares no image when false", async () => {
    const outDir = await buildSite({ url: origin, ogImage: false });
    expect(head(join(outDir, "index.html")).image).toBeUndefined();
    expect(existsSync(join(outDir, "og"))).toBe(false);
  }, 60_000);
});

describe("a page whose site has no address", () => {
  it("shares its title but no canonical link or image", () => {
    const html = manualPage({
      options: resolveOptions({ title: "Thing" }),
      routes: routesFor("/"),
      pages: [{ slug: "start", title: "Start" }],
      slug: "start",
      page: {
        title: "Start",
        summary: "How to start.",
        html: "<p>How to start.</p>",
        headings: [],
        islands: [],
        files: [],
      },
      assets: { head: "" },
    });
    const document = new JSDOM(html).window.document;
    const og = (name: string) =>
      document.querySelector(`meta[property="og:${name}"]`);
    expect(og("title")?.getAttribute("content")).toBe("Start");
    expect(og("image")).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
