import { Marked, type Token, type Tokens } from "marked";

import type { Routes } from "./layout.ts";
import { docsFile, islandComment, rewriteHref } from "./markdown.ts";
import type { ResolvedOptions } from "./options.ts";
import { docsSourceUrl, type Site } from "./site.ts";

/** A path as a full URL when the site's address is known, else as it is. */
function link(routes: Routes, path: string): string {
  return routes.absolute(path) ?? path;
}

/**
 * A page's markdown as an agent reads it outside the docs folder. A link to
 * a manual page goes to that page's Markdown file, an image to the address
 * the site serves it at, and an island comment becomes a link to the web
 * page that mounts it.
 */
function portable(
  source: string,
  site: Site,
  options: ResolvedOptions,
  routes: Routes,
  htmlUrl: string,
): string {
  const context = {
    pages: site.pages,
    pageUrl: (slug: string) => link(routes, routes.markdown(slug)),
    sourceUrl: (file: string) => docsSourceUrl(options, file),
  };
  const marked = new Marked();
  return marked
    .lexer(source)
    .map((block) => {
      if (block.type === "code") return block.raw;
      if (block.type === "html" && islandComment.test(block.text.trim())) {
        const end = /\n*$/.exec(block.raw)?.[0] ?? "";
        return `The [web page](${htmlUrl}) shows a live demo here.${end}`;
      }
      let raw = block.raw;
      let from = 0;
      marked.walkTokens([block], (token: Token) => {
        if (token.type !== "link" && token.type !== "image") return;
        const { href } = token as Tokens.Link | Tokens.Image;
        const file = token.type === "image" ? docsFile.exec(href)?.[1] : null;
        const target = file
          ? link(routes, routes.file(file))
          : rewriteHref(href, context);
        const at = raw.indexOf(token.raw, from);
        if (at === -1 || target === href) return;
        const rewritten = token.raw.replace(`](${href}`, `](${target}`);
        raw = raw.slice(0, at) + rewritten + raw.slice(at + token.raw.length);
        from = at + rewritten.length;
      });
      return raw;
    })
    .join("");
}

/** YAML that names the page and its web address, ahead of its markdown. */
function frontmatter(fields: Record<string, string | undefined>): string {
  const lines = Object.entries(fields)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

export interface AgentFile {
  /** The path under the site's base. */
  path: string;
  body: string;
}

/**
 * The files agents read in place of the HTML: each page's markdown as
 * `<slug>.md` beside its page, `index.md` for the home page, and the
 * `llms.txt` index and `llms-full.txt` of llmstxt.org.
 */
export function agentFiles(
  site: Site,
  options: ResolvedOptions,
  routes: Routes,
): AgentFile[] {
  const index = link(routes, routes.llms);
  const footer = `\n\nThe manual's pages are listed in [llms.txt](${index}).\n`;
  const pages = site.pages.map((page) => {
    const htmlUrl = link(routes, routes.page(page.slug));
    const body = portable(
      site.sources.get(page.slug) ?? "",
      site,
      options,
      routes,
      htmlUrl,
    ).trimEnd();
    const head = frontmatter({
      title: page.title,
      description: site.rendered.get(page.slug)?.summary,
      url: routes.absolute(routes.page(page.slug)),
    });
    return { page, body, file: `${head}${body}${footer}` };
  });

  const files: AgentFile[] = pages.map(({ page, file }) => ({
    path: routes.markdown(page.slug),
    body: file,
  }));
  if (site.homeSource !== undefined) {
    const body = portable(
      site.homeSource,
      site,
      options,
      routes,
      link(routes, routes.home),
    ).trimEnd();
    const head = frontmatter({
      title: options.title,
      description: options.description || site.home?.summary,
      url: routes.absolute(routes.home),
    });
    files.push({ path: routes.markdown(), body: `${head}${body}${footer}` });
  }

  const summary = options.description || site.home?.summary || "";
  const list = site.pages
    .map((page) => {
      const about = site.rendered.get(page.slug)?.summary;
      const url = link(routes, routes.markdown(page.slug));
      return `- [${page.title}](${url})${about ? `: ${about}` : ""}`;
    })
    .join("\n");
  const title = `# ${options.title}\n\n${summary ? `> ${summary}\n\n` : ""}`;
  files.push({
    path: routes.llms,
    body: `${title}## Manual\n\n${list}\n\n## Optional\n\n- [Every page in one file](${link(routes, routes.llmsFull)})\n`,
  });
  files.push({
    path: routes.llmsFull,
    body: `${title}${pages.map(({ body }) => body).join("\n\n")}\n`,
  });
  return files.map((file) => ({
    ...file,
    path: file.path.slice(routes.home.length),
  }));
}
