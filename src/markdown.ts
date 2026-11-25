import { posix } from "node:path";

import {
  Marked,
  type Token,
  type TokenizerAndRendererExtension,
  type Tokens,
} from "marked";

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
  /** The docs folder's files the page's images show, relative to the folder. */
  files: string[];
}

export interface RenderContext {
  pages: PageEntry[];
  /** The route of a manual page. */
  pageUrl: (slug: string) => string;
  /** Where a `.md` link that is not a manual page points, such as GitHub. */
  sourceUrl: (file: string) => string;
  /** The URL the site serves a file of the docs folder at. */
  fileUrl: (file: string) => string;
  /**
   * The pixel size of a docs folder image. The `<img>` carries it so the page
   * keeps the image's space before it loads.
   */
  imageSize?: (file: string) => { width: number; height: number };
  /** Renders a paragraph of nothing but links as a row of buttons. */
  actions?: boolean;
  /** The slug of the page being rendered. Relative links resolve from its folder. */
  slug?: string;
}

/** An image path inside the docs folder, such as `shots/home.png`. */
export const docsFile =
  /^(?:\.\/)?((?:[\w-]+\/)*[\w-]+\.(?:png|jpe?g|gif|svg|webp|avif))$/;

const external = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** A relative path as seen from the docs folder, from the page `slug`. */
function fromPage(path: string, slug = "index"): string {
  return posix.join(posix.dirname(slug), path);
}

/** The docs folder image a page's image `href` shows, or none. */
export function docsImage(href: string, slug?: string): string | undefined {
  if (external.test(href) || href.startsWith("/")) return undefined;
  return docsFile.exec(fromPage(href, slug))?.[1];
}

const frontmatterBlock = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function unquote(value: string): string {
  if (/^".*"$/.test(value)) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }
  if (/^'.*'$/.test(value)) return value.slice(1, -1).replaceAll("''", "'");
  return value;
}

/**
 * A page's leading YAML frontmatter and the markdown after it. `fields`
 * holds the top-level keys with a one-line value; nested and block values
 * are left out.
 */
export function splitFrontmatter(source: string): {
  fields: Record<string, string>;
  body: string;
} {
  const match = frontmatterBlock.exec(source);
  if (!match) return { fields: {}, body: source };
  const fields: Record<string, string> = {};
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    const field = /^([A-Za-z][\w-]*):[ \t]+([^|>\s].*?)\s*$/.exec(line);
    if (field) fields[field[1] ?? ""] = unquote(field[2] ?? "");
  }
  const body = source.slice(match[0].length).replace(/^(?:[ \t]*\r?\n)+/, "");
  return { fields, body };
}

/** The callouts a `::: kind` container or a GitHub `> [!KIND]` alert makes, with their titles. */
const calloutTitles: Record<string, string> = {
  note: "Note",
  info: "Info",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
  danger: "Danger",
};

/** A callout of `kind`. `label` is the title's HTML; without one the kind names it. */
function callout(kind: string, label: string, inner: string): string {
  const title = label || escapeHtml(calloutTitles[kind] ?? "");
  if (kind === "details")
    return `<details class="callout" data-kind="details"><summary>${title || "Details"}</summary>${inner}</details>\n`;
  if (kind === "code-group") return `<div class="code-group">${inner}</div>\n`;
  return `<div class="callout" data-kind="${kind}" role="note"><p class="callout-title">${title}</p>${inner}</div>\n`;
}

interface ContainerToken extends Tokens.Generic {
  kind: string;
  label: Token[];
  tokens: Token[];
}

/**
 * A VitePress container: `::: kind label`, its markdown, then `:::`. A
 * container holding another opens and closes with a longer run of colons.
 */
const container: TokenizerAndRendererExtension = {
  name: "container",
  level: "block",
  start: (src) => /^:{3,}/m.exec(src)?.index,
  tokenizer(src) {
    const match =
      /^(:{3,})[ \t]*([a-z-]+)[ \t]*(.*)\n((?:[\s\S]*?\n)?)\1[ \t]*(?:\n+|$)/.exec(
        src,
      );
    const kind = match?.[2] ?? "";
    if (
      !match ||
      !(kind in calloutTitles || kind === "details" || kind === "code-group")
    )
      return undefined;
    return {
      type: "container",
      raw: match[0],
      kind,
      label: this.lexer.inlineTokens((match[3] ?? "").trim()),
      tokens: this.lexer.blockTokens(match[4] ?? ""),
    };
  },
  renderer(token) {
    const { kind, label, tokens } = token as ContainerToken;
    return callout(
      kind,
      this.parser.parseInline(label),
      this.parser.parse(tokens),
    );
  },
};

const alertMarker = /^\[!(note|tip|important|warning|caution)\][ \t]*(?:\n|$)/i;

/** `<!-- island NAME -->` on its own line places a mounted component. */
export const islandComment = /^<!--\s*island\s+([a-z0-9-]+)\s*-->\s*$/;

/** The element a page's island mounts into. */
export function islandElement(name: string): string {
  return `<div class="island" data-island="${name}"></div>`;
}

const lastIsland = /<div class="island" data-island="([a-z0-9-]+)"><\/div>\s*$/;

/** Splits off the island a page's HTML ends with, when it ends with one. */
export function trailingIsland(html: string): {
  body: string;
  island?: string;
} {
  const match = lastIsland.exec(html);
  if (!match) return { body: html };
  return { body: html.slice(0, match.index), island: match[1] };
}

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

/**
 * A link to a manual page becomes `pageUrl` of its slug; a link to a `.md`
 * file the manual does not list goes to `sourceUrl`. Any other link stays.
 * A relative link resolves from the page's folder, and a link that starts
 * with `/` from the docs folder, with or without `.md`, as VitePress reads
 * it.
 */
export function rewriteHref(
  href: string,
  context: Pick<RenderContext, "pages" | "pageUrl" | "sourceUrl" | "slug">,
): string {
  if (external.test(href) || href.startsWith("#")) return href;
  const at = href.indexOf("#");
  const path = at === -1 ? href : href.slice(0, at);
  const hash = at === -1 ? "" : href.slice(at);
  const file = path.startsWith("/")
    ? posix.normalize(path.slice(1))
    : fromPage(path, context.slug);
  const name = file.replace(/\.(?:md|html)$/, "").replace(/\/$/, "");
  const page = [name, `${name}/index`].find((slug) =>
    context.pages.some((entry) => entry.slug === slug),
  );
  if (page) return `${context.pageUrl(page)}${hash}`;
  if (file.endsWith(".md")) return `${context.sourceUrl(file)}${hash}`;
  return href;
}

export function renderPage(
  markdown: string,
  context: RenderContext,
): RenderedPage {
  const ids = new WeakMap<Tokens.Heading, string>();
  const headings: Heading[] = [];
  const islands: string[] = [];
  const files: string[] = [];
  let title = "";
  let summary = "";

  const marked: Marked = new Marked({
    extensions: [container],
    renderer: {
      code({ text, lang }: Tokens.Code) {
        // VitePress info strings add `{1,3}`, `:line-numbers` and a `[file]` label.
        const language = /^[\w+#-]+/.exec(lang ?? "")?.[0] ?? "text";
        const label = /\[([^\]]+)\]/.exec(lang ?? "")?.[1] ?? language;
        return `<figure class="code"><figcaption><span>${escapeHtml(label)}</span><button class="copy" type="button">Copy</button></figcaption>${highlight(text, language)}</figure>\n`;
      },
      blockquote({ tokens }: Tokens.Blockquote): string {
        const first = tokens[0];
        const alert =
          first?.type === "paragraph" ? alertMarker.exec(first.raw) : null;
        if (!first || !alert)
          return `<blockquote>\n${this.parser.parse(tokens)}</blockquote>\n`;
        const rest = first.raw.slice(alert[0].length);
        const body: Token[] = [
          ...(rest.trim() ? marked.lexer(rest) : []),
          ...tokens.slice(1),
        ];
        return callout(
          (alert[1] ?? "").toLowerCase(),
          "",
          this.parser.parse(body),
        );
      },
      html({ text }: Tokens.HTML | Tokens.Tag) {
        const island = islandComment.exec(text.trim())?.[1];
        if (!island) return text;
        islands.push(island);
        return `${islandElement(island)}\n`;
      },
      link({ href, title: linkTitle, tokens }: Tokens.Link) {
        const target = rewriteHref(href, context);
        const offsite = /^https?:/.test(target);
        const attrs = [
          `href="${escapeHtml(target)}"`,
          linkTitle ? `title="${escapeHtml(linkTitle)}"` : "",
          offsite ? 'rel="noreferrer"' : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<a ${attrs}>${this.parser.parseInline(tokens)}</a>`;
      },
      image({ href, title: imageTitle, text }: Tokens.Image) {
        const file = docsImage(href, context.slug);
        if (file && !files.includes(file)) files.push(file);
        const size = file ? context.imageSize?.(file) : undefined;
        const attrs = [
          `src="${escapeHtml(file ? context.fileUrl(file) : href)}"`,
          `alt="${escapeHtml(text)}"`,
          imageTitle ? `title="${escapeHtml(imageTitle)}"` : "",
          size ? `width="${size.width}" height="${size.height}"` : "",
          'loading="lazy"',
        ]
          .filter(Boolean)
          .join(" ");
        return `<img ${attrs}>`;
      },
      paragraph({ tokens }: Tokens.Paragraph) {
        const inner = this.parser.parseInline(tokens);
        const links = tokens.filter((token) => token.type === "link");
        const onlyLinks =
          links.length > 0 &&
          tokens.every(
            (token) =>
              token.type === "link" ||
              (token.type === "text" && token.raw.trim() === ""),
          );
        if (!context.actions || !onlyLinks) return `<p>${inner}</p>\n`;
        const buttons = links
          .map((token, index) =>
            this.parser
              .parseInline([token])
              .replace(
                "<a ",
                `<a class="btn ${index === 0 ? "btn-primary" : "btn-ghost"}" `,
              ),
          )
          .join("");
        return `<p class="actions">${buttons}</p>\n`;
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

  const { fields, body } = splitFrontmatter(markdown);
  const tokens = marked.lexer(body);
  const used = new Map<string, number>();
  for (const token of tokens) {
    if (token.type === "paragraph" && !summary && (title || fields.title))
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

  const html = marked.parser(tokens);
  return {
    title: title || fields.title || "",
    summary: fields.description ?? summary,
    html,
    headings,
    islands,
    files,
  };
}
