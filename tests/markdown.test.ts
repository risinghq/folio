import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { renderPage } from "../src/markdown.ts";

const markdown = readFileSync(
  new URL("fixture/docs/getting-started.md", import.meta.url),
  "utf8",
);
const page = renderPage(markdown, {
  pages: [
    { slug: "getting-started", title: "Getting started" },
    { slug: "create-thing", title: "createThing" },
  ],
  pageUrl: (slug) => `/base/docs/${slug}`,
  sourceUrl: (file) => `https://github.com/o/r/blob/master/docs/${file}`,
});

describe("renderPage", () => {
  it("takes the title and summary from the page and leaves h1 out of the body", () => {
    expect(page.title).toBe("Getting started");
    expect(page.summary).toBe(
      "Install it with npm. See createThing and the changelog.",
    );
    expect(page.html).not.toContain("<h1");
  });

  it("gives repeated headings unique ids", () => {
    expect(page.headings).toEqual([
      { id: "options", title: "Options", depth: 2 },
      { id: "options-1", title: "Options", depth: 2 },
      { id: "deep", title: "Deep", depth: 3 },
    ]);
    expect(page.html).toContain('<h2 id="options-1">');
  });

  it("routes page links and sends other .md links to the source", () => {
    expect(page.html).toContain('href="/base/docs/create-thing#options"');
    expect(page.html).toContain(
      'href="https://github.com/o/r/blob/master/docs/changelog.md"',
    );
  });

  it("highlights code with a copy button", () => {
    expect(page.html).toMatch(
      /<figure class="code" data-lang="ts"><button class="copy"[^>]*>Copy<\/button><pre/,
    );
  });

  it("wraps tables and places islands", () => {
    expect(page.html).toContain('<div class="table"><table>');
    expect(page.islands).toEqual(["counter"]);
    expect(page.html).toContain(
      '<div class="island" data-island="counter"></div>',
    );
  });
});
