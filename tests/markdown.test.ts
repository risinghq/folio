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

describe("a page in a folder", () => {
  const nested = renderPage(
    readFileSync(
      new URL("fixture/docs/guide/writing.md", import.meta.url),
      "utf8",
    ),
    {
      ...context,
      pages: [
        ...context.pages,
        { slug: "guide/writing", title: "Writing pages" },
      ],
      sourceUrl: (file: string) => `source:${file}`,
      slug: "guide/writing",
    },
  );
  const hrefs = [...nested.html.matchAll(/href="([^"]+)"/g)].map(
    (match) => match[1],
  );

  it("takes its title and summary from frontmatter and does not show it", () => {
    expect(nested.title).toBe("Writing pages");
    expect(nested.summary).toBe(
      "How a page in a folder links, warns and labels code.",
    );
    expect(nested.html).not.toContain("outline");
  });

  it("resolves relative links from its folder and root links from the docs folder", () => {
    expect(hrefs).toEqual([
      "/base/docs/getting-started",
      "/base/docs/create-thing#options",
      "source:../LICENSE.md",
      "/base/docs/create-thing",
    ]);
  });

  it("serves an image from a parent folder", () => {
    expect(nested.files).toEqual(["images/shot.svg"]);
  });

  it("turns alerts and containers into callouts and keeps a plain quote", () => {
    const callouts = [
      ...nested.html.matchAll(/class="callout" data-kind="([a-z]+)"/g),
    ].map((match) => match[1]);
    expect(callouts).toEqual(["warning", "tip", "details"]);
    expect(nested.html).toContain('<p class="callout-title">Keep it short</p>');
    expect(nested.html).toContain("<blockquote>\n<p>A plain quote.</p>");
    expect(nested.html).not.toMatch(/\[!WARNING\]|:::/);
  });

  it("labels a code block with its file name", () => {
    expect(nested.html).toMatch(/<figcaption><span>vite\.config\.ts<\/span>/);
    expect(nested.html).toContain("export");
  });

  it("renders a container's title as inline markdown", () => {
    const { html } = renderPage(
      "# T\n\n::: tip `skipLibCheck` & *more*\nBody.\n:::",
      context,
    );
    const title = /<p class="callout-title">(.*?)<\/p>/.exec(html)?.[1];
    expect(title).toBe("<code>skipLibCheck</code> &amp; <em>more</em>");
  });

  it("leaves an unknown container as text", () => {
    const { html } = renderPage("# T\n\n::: unknown\nBody.\n:::", context);
    expect(html).not.toContain("callout");
    expect(html).toContain("Body.");
  });

  it("prefers the page's heading to a frontmatter title", () => {
    const { title, summary } = renderPage(
      "---\ntitle: Meta\n---\n\n# Heading\n\nText.",
      context,
    );
    expect(title).toBe("Heading");
    expect(summary).toBe("Text.");
  });
});
