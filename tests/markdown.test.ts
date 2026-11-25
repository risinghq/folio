import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { renderPage } from "../src/markdown.ts";

const markdown = readFileSync(
  new URL("fixture/docs/getting-started.md", import.meta.url),
  "utf8",
);
const context = {
  pages: [
    { slug: "getting-started", title: "Getting started" },
    { slug: "create-thing", title: "createThing" },
  ],
  pageUrl: (slug: string) => `/base/docs/${slug}`,
  sourceUrl: (file: string) =>
    `https://github.com/o/r/blob/master/docs/${file}`,
  fileUrl: (file: string) => `/base/docs/${file}`,
};
const page = renderPage(markdown, context);

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
      /<figure class="code"><figcaption><span>ts<\/span><button class="copy"[^>]*>Copy<\/button><\/figcaption><pre/,
    );
  });

  it("wraps tables and places islands", () => {
    expect(page.html).toContain('<div class="table"><table>');
    expect(page.islands).toEqual(["counter"]);
    expect(page.html).toContain(
      '<div class="island" data-island="counter"></div>',
    );
  });

  it("serves a docs folder image and leaves a remote one alone", () => {
    const shown = renderPage(
      "# T\n\n![Shot](./images/shot.png) ![Badge](https://x.dev/b.svg)",
      context,
    );
    expect(shown.files).toEqual(["images/shot.png"]);
    expect(shown.html).toContain(
      '<img src="/base/docs/images/shot.png" alt="Shot" loading="lazy">',
    );
    expect(shown.html).toContain('src="https://x.dev/b.svg"');
  });

  it("turns a paragraph of links into buttons only on the home page", () => {
    const source = "# T\n\n[Start](getting-started.md)\n[Repo](https://x.dev)";
    const home = renderPage(source, { ...context, actions: true });
    expect(home.html).toContain(
      '<p class="actions"><a class="btn btn-primary" href="/base/docs/getting-started">Start</a>',
    );
    expect(home.html).toContain(
      '<a class="btn btn-ghost" href="https://x.dev" rel="noreferrer">Repo</a>',
    );
    expect(renderPage(source, context).html).not.toContain("btn");
  });
});
