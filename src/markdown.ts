import { Marked, type Tokens } from "marked";

import { highlight } from "./highlight.ts";
import type { PageEntry } from "./manual.ts";

export interface Heading {
  id: string;
  title: string;
  depth: number;
}

export interface RenderedPage {
  /** The page's `#` heading, as plain text. */
  title: string;
  /** The page's first paragraph, as plain text: its meta description. */
  summary: string;
  /** The article body, without the `#` heading. */
  html: string;
  /** The `##` and `###` headings, in order. */
  headings: Heading[];
  /** The island names the page mounts, in order. */
  islands: string[];
}

export interface RenderContext {
  pages: PageEntry[];
  /** The route of a manual page. */
  pageUrl: (slug: string) => string;
  /** Where a `.md` link that is not a manual page points, such as GitHub. */
  sourceUrl: (file: string) => string;
}

/** `<!-- island NAME -->` on its own line places a mounted component. */
const islandComment = /^<!--\s*island\s+([a-z0-9-]+)\s*-->\s*$/;

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("`", "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function plain(text: string): string {
  return text
    .replaceAll("`", "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** A link to another `.md` page becomes its route; a link to any other file stays. */
function rewriteHref(href: string, context: RenderContext): string {
  const match = /^(?:\.\/)?([a-z0-9-]+)\.md(#.*)?$/.exec(href);
  if (!match) return href;
  const [, name = "", hash = ""] = match;
  return context.pages.some((page) => page.slug === name)
    ? `${context.pageUrl(name)}${hash}`
    : `${context.sourceUrl(`${name}.md`)}${hash}`;
}

export function renderPage(
  markdown: string,
  context: RenderContext,
): RenderedPage {
  const ids = new WeakMap<Tokens.Heading, string>();
  const headings: Heading[] = [];
  const islands: string[] = [];
  let title = "";
  let summary = "";

  const marked = new Marked({
    renderer: {
      code({ text, lang }: Tokens.Code) {
        const language = (lang ?? "text").split(/\s/)[0] || "text";
        return `<figure class="code"><figcaption><span>${escapeHtml(language)}</span><button class="copy" type="button">Copy</button></figcaption>${highlight(text, language)}</figure>\n`;
      },
      html({ text }: Tokens.HTML | Tokens.Tag) {
        const island = islandComment.exec(text.trim())?.[1];
        if (!island) return text;
        islands.push(island);
        return `<div class="island" data-island="${island}"></div>\n`;
      },
      link({ href, title: linkTitle, tokens }: Tokens.Link) {
        const target = rewriteHref(href, context);
        const external = /^https?:/.test(target);
        const attrs = [
          `href="${escapeHtml(target)}"`,
          linkTitle ? `title="${escapeHtml(linkTitle)}"` : "",
          external ? 'rel="noreferrer"' : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<a ${attrs}>${this.parser.parseInline(tokens)}</a>`;
      },
      table(token: Tokens.Table) {
        const cell = (entry: Tokens.TableCell, tag: string) => {
          const align = entry.align ? ` style="text-align:${entry.align}"` : "";
          return `<${tag}${align}>${this.parser.parseInline(entry.tokens)}</${tag}>`;
        };
        const head = token.header.map((entry) => cell(entry, "th")).join("");
        const body = token.rows
          .map(
            (row) =>
              `<tr>${row.map((entry) => cell(entry, "td")).join("")}</tr>`,
          )
          .join("");
        return `<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
      },
      heading(token: Tokens.Heading) {
        if (token.depth === 1) return "";
        const id = ids.get(token) ?? slugify(token.text);
        const inner = this.parser.parseInline(token.tokens);
        return `<h${token.depth} id="${id}"><a class="anchor" href="#${id}">${inner}</a></h${token.depth}>\n`;
      },
    },
  });

  const tokens = marked.lexer(markdown);
  const used = new Map<string, number>();
  for (const token of tokens) {
    if (token.type === "paragraph" && !summary && title)
      summary = plain(token.text);
    if (token.type !== "heading") continue;
    const heading = token as Tokens.Heading;
    if (heading.depth === 1) {
      title ||= plain(heading.text);
      continue;
    }
    const base = slugify(heading.text);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;
    ids.set(heading, id);
    if (heading.depth <= 3)
      headings.push({ id, title: plain(heading.text), depth: heading.depth });
  }

  return { title, summary, html: marked.parser(tokens), headings, islands };
}
