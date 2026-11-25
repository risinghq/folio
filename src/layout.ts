import type { PageEntry } from "./manual.ts";
import { escapeHtml, type RenderedPage } from "./markdown.ts";
import type { ResolvedOptions } from "./options.ts";

/** The routes of one site, under Vite's `base`. */
export interface Routes {
  home: string;
  page: (slug: string) => string;
}

export function routesFor(base: string): Routes {
  const root = base.endsWith("/") ? base : `${base}/`;
  return { home: root, page: (slug) => `${root}docs/${slug}` };
}

/** What a built page links to: Vite's script and style tags for the client entry. */
export interface Assets {
  head: string;
}

interface Shell {
  title: string;
  description: string;
  body: string;
}

/**
 * Runs before first paint, so the saved theme never flashes. It is inline
 * because a module script runs after the page has painted.
 */
const themeScript = `<script>try{var t=localStorage.getItem("folio-theme");document.documentElement.dataset.theme=t==="light"||t==="dark"?t:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}</script>`;

function document(shell: Shell, assets: Assets): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(shell.title)}</title>
${shell.description ? `<meta name="description" content="${escapeHtml(shell.description)}">` : ""}
${themeScript}
${assets.head}
</head>
<body>
${shell.body}
</body>
</html>
`;
}

function header(
  options: ResolvedOptions,
  routes: Routes,
  pages: PageEntry[],
): string {
  const links = [
    { text: "Manual", href: routes.page(pages[0]?.slug ?? "") },
    ...options.nav,
    ...(options.repository
      ? [{ text: "GitHub", href: options.repository }]
      : []),
  ];
  const nav = links
    .map((link) => {
      const external = /^https?:/.test(link.href) ? ' rel="noreferrer"' : "";
      return `<a href="${escapeHtml(link.href)}"${external}>${escapeHtml(link.text)}</a>`;
    })
    .join("");
  return `<a class="skip" href="#content">Skip to content</a>
<header class="site-header">
<button class="menu-button" type="button" aria-controls="sidebar" aria-expanded="false" aria-label="Open the manual's pages"><span></span></button>
<a class="brand" href="${routes.home}"><span class="brand-mark" aria-hidden="true"></span>${escapeHtml(options.title)}</a>
<nav aria-label="Site">${nav}<button class="theme-toggle" type="button" aria-label="Switch between light and dark"></button></nav>
</header>`;
}

function sidebar(pages: PageEntry[], current: string, routes: Routes): string {
  const items = pages
    .map((page) => {
      const currentAttr = page.slug === current ? ' aria-current="page"' : "";
      return `<li><a href="${routes.page(page.slug)}"${currentAttr}>${escapeHtml(page.title)}</a></li>`;
    })
    .join("");
  return `<nav class="sidebar" id="sidebar" aria-label="Manual"><p>Manual</p><ul>${items}</ul></nav>`;
}

function toc(page: RenderedPage): string {
  if (page.headings.length === 0) return "";
  const items = page.headings
    .map(
      (heading) =>
        `<li data-depth="${heading.depth}"><a href="#${heading.id}">${escapeHtml(heading.title)}</a></li>`,
    )
    .join("");
  return `<nav class="toc" aria-label="On this page"><p>On this page</p><ul>${items}</ul></nav>`;
}

function pager(pages: PageEntry[], current: string, routes: Routes): string {
  const index = pages.findIndex((page) => page.slug === current);
  const link = (page: PageEntry | undefined, rel: string, label: string) =>
    page
      ? `<a href="${routes.page(page.slug)}" rel="${rel}"><span>${label}</span>${escapeHtml(page.title)}</a>`
      : "";
  return `<nav aria-label="Pages">${link(pages[index - 1], "prev", "Previous")}${link(pages[index + 1], "next", "Next")}</nav>`;
}

function footer(options: ResolvedOptions): string {
  return options.footer
    ? `<footer class="site-footer">${options.footer}</footer>`
    : "";
}

export interface ManualPageInput {
  options: ResolvedOptions;
  routes: Routes;
  pages: PageEntry[];
  slug: string;
  page: RenderedPage;
  assets: Assets;
}

export function manualPage(input: ManualPageInput): string {
  const { options, routes, pages, slug, page } = input;
  const edit = options.repository
    ? `<a href="${escapeHtml(`${options.repository}/edit/${options.branch}/${options.docsPath}/${slug}.md`)}" rel="noreferrer">Edit this page on GitHub</a>`
    : "";
  const body = `${header(options, routes, pages)}
<div class="doc-layout">
${sidebar(pages, slug, routes)}
<main id="content" class="doc">
<h1>${escapeHtml(page.title)}</h1>
<article class="prose">
${page.html}
</article>
<footer class="doc-footer">${edit}${pager(pages, slug, routes)}</footer>
</main>
${toc(page)}
</div>
${footer(options)}`;
  return document(
    {
      title: `${page.title} · ${options.title}`,
      description: page.summary,
      body,
    },
    input.assets,
  );
}

export interface HomePageInput {
  options: ResolvedOptions;
  routes: Routes;
  pages: PageEntry[];
  assets: Assets;
}

/** The home page: the landing island in the site's shell, or a link to the manual. */
export function homePage(input: HomePageInput): string {
  const { options, routes, pages } = input;
  const first = routes.page(pages[0]?.slug ?? "");
  const main = options.landing
    ? `<main id="content" class="island landing-root" data-island="${escapeHtml(options.landing)}" data-eager></main>`
    : `<main id="content" class="not-found"><h1>${escapeHtml(options.title)}</h1><p><a href="${first}">Read the manual</a></p></main>`;
  const body = `${header(options, routes, pages)}
${main}
${footer(options)}`;
  return document(
    { title: options.title, description: options.description, body },
    input.assets,
  );
}

export function notFoundPage(input: HomePageInput): string {
  const { options, routes, pages } = input;
  const items = pages
    .map(
      (page) =>
        `<li><a href="${routes.page(page.slug)}">${escapeHtml(page.title)}</a></li>`,
    )
    .join("");
  const body = `${header(options, routes, pages)}
<main id="content" class="not-found"><h1>Page not found</h1><p>These pages exist:</p><ul>${items}</ul></main>
${footer(options)}`;
  return document(
    { title: `Page not found · ${options.title}`, description: "", body },
    input.assets,
  );
}
