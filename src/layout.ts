import type { PageEntry } from "./manual.ts";
import {
  escapeHtml,
  islandElement,
  trailingIsland,
  type RenderedPage,
} from "./markdown.ts";
import { repositoryFileUrl, type ResolvedOptions } from "./options.ts";

/** The routes of one site, under Vite's `base`. */
export interface Routes {
  home: string;
  page: (slug: string) => string;
  /** A file of the docs folder, such as an image. */
  file: (path: string) => string;
  /** A page's social card, or the home page's with no slug. */
  card: (slug?: string) => string;
  /** A page's Markdown file for agents, or the home page's with no slug. */
  markdown: (slug?: string) => string;
  /** The index of the manual for agents, `llms.txt`. */
  llms: string;
  /** Every page of the manual in one file, `llms-full.txt`. */
  llmsFull: string;
  /** A path as a full URL, or none when the site's address is unknown. */
  absolute: (path: string) => string | undefined;
}

export function routesFor(base: string, url?: string): Routes {
  const root = base.endsWith("/") ? base : `${base}/`;
  return {
    home: root,
    page: (slug) => `${root}docs/${slug}`,
    file: (path) => `${root}docs/${path}`,
    card: (slug) =>
      slug ? `${root}og/docs/${slug}.png` : `${root}og/index.png`,
    markdown: (slug) => (slug ? `${root}docs/${slug}.md` : `${root}index.md`),
    llms: `${root}llms.txt`,
    llmsFull: `${root}llms-full.txt`,
    absolute: (path) => (url ? new URL(path, url).href : undefined),
  };
}

/** The image a page shares, as a full URL, or none. */
function shareImage(
  options: ResolvedOptions,
  routes: Routes,
  slug?: string,
): string | undefined {
  const image = options.ogImage;
  if (image === false) return undefined;
  if (image === undefined) return routes.absolute(routes.card(slug));
  if (/^https?:\/\//.test(image)) return image;
  return routes.absolute(`${routes.home}${image.replace(/^\//, "")}`);
}

/** What a built page links to: Vite's script and style tags for the client entry. */
export interface Assets {
  head: string;
}

/** How a page presents itself to search engines and link previews. */
interface Social {
  site: string;
  title: string;
  url?: string;
  image?: string;
}

interface Shell {
  title: string;
  description: string;
  body: string;
  /** The page's Markdown for agents, when it has one. */
  markdown?: string;
  /** None marks a page search engines should not index. */
  social?: Social;
}

function socialTags(shell: Shell): string {
  const social = shell.social;
  if (!social) return `<meta name="robots" content="noindex">`;
  const property = (name: string, content: string | undefined) =>
    content ? `<meta property="${name}" content="${escapeHtml(content)}">` : "";
  return [
    social.url ? `<link rel="canonical" href="${escapeHtml(social.url)}">` : "",
    property("og:type", "website"),
    property("og:site_name", social.site),
    property("og:title", social.title),
    property("og:description", shell.description),
    property("og:url", social.url),
    property("og:image", social.image),
    social.image
      ? `<meta name="twitter:card" content="summary_large_image">`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
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
${socialTags(shell)}
${shell.markdown ? `<link rel="alternate" type="text/markdown" href="${escapeHtml(shell.markdown)}">` : ""}
${themeScript}
${assets.head}
</head>
<body>
${shell.body}
</body>
</html>
`;
}

const pageNumber = (index: number) => String(index + 1).padStart(2, "0");

function header(
  options: ResolvedOptions,
  routes: Routes,
  pages: PageEntry[],
  inManual: boolean,
): string {
  const manual = `<a href="${routes.page(pages[0]?.slug ?? "")}"${inManual ? ' aria-current="true"' : ""}>Manual</a>`;
  const links = [
    ...options.nav,
    ...(options.npm
      ? [{ text: "npm", href: `https://www.npmjs.com/package/${options.npm}` }]
      : []),
    ...(options.repository
      ? [{ text: "GitHub", href: options.repository }]
      : []),
  ]
    .map((link) => {
      const external = /^https?:/.test(link.href) ? ' rel="noreferrer"' : "";
      return `<a href="${escapeHtml(link.href)}"${external}>${escapeHtml(link.text)}</a>`;
    })
    .join("");
  const version = options.version
    ? `<span class="version">${escapeHtml(options.version)}</span>`
    : "";
  return `<a class="skip" href="#content">Skip to content</a>
<header class="site-header">
<a class="brand" href="${routes.home}"><span class="brand-mark" aria-hidden="true"></span>${escapeHtml(options.title)}</a>${version}
<nav class="site-nav" aria-label="Site">${manual}${links}</nav>
<button class="theme-toggle" type="button" aria-label="Switch between light and dark"></button>
</header>`;
}

function sidebar(pages: PageEntry[], current: string, routes: Routes): string {
  const items = pages
    .map((page, index) => {
      const currentAttr = page.slug === current ? ' aria-current="page"' : "";
      return `<li><a href="${routes.page(page.slug)}"${currentAttr}><span class="num">${pageNumber(index)}</span><span>${escapeHtml(page.title)}</span></a></li>`;
    })
    .join("");
  return `<nav class="sidebar" id="sidebar" aria-label="Manual">
<div class="sidebar-head"><span>Manual</span><span>${pages.length}</span><button class="menu-close" type="button" aria-label="Close the manual's pages"></button></div>
<ol>${items}</ol>
</nav>
<div class="scrim" aria-hidden="true"></div>`;
}

function headingList(page: RenderedPage): string {
  return page.headings
    .map(
      (heading) =>
        `<li data-depth="${heading.depth}"><a href="#${heading.id}">${escapeHtml(heading.title)}</a></li>`,
    )
    .join("");
}

function rail(page: RenderedPage): string {
  const toc = page.headings.length
    ? `<nav class="toc" aria-label="On this page"><p>On this page</p><ul>${headingList(page)}</ul></nav>`
    : "";
  return `<aside class="rail">${toc}<a class="to-top" href="#content">Back to top</a></aside>`;
}

function inlineToc(page: RenderedPage): string {
  return page.headings.length
    ? `<details class="toc-inline"><summary>On this page</summary><ul>${headingList(page)}</ul></details>`
    : "";
}

function pager(pages: PageEntry[], index: number, routes: Routes): string {
  const link = (offset: number, rel: string, label: string) => {
    const page = pages[index + offset];
    if (!page) return "";
    const number = pageNumber(index + offset);
    const caption =
      rel === "prev" ? `← ${label} · ${number}` : `${number} · ${label} →`;
    return `<a href="${routes.page(page.slug)}" rel="${rel}"><span>${caption}</span>${escapeHtml(page.title)}</a>`;
  };
  return `<nav class="pager" aria-label="Pages">${link(-1, "prev", "Previous")}${link(1, "next", "Next")}</nav>`;
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
  const editUrl = repositoryFileUrl(options, "edit", `${slug}.md`);
  const edit = editUrl
    ? `<a href="${escapeHtml(editUrl)}" rel="noreferrer">Edit this page on GitHub</a>`
    : "";
  const index = pages.findIndex((entry) => entry.slug === slug);
  const number = pageNumber(index);
  const first = routes.page(pages[0]?.slug ?? "");
  const markdown = routes.markdown(slug);
  const body = `${header(options, routes, pages, true)}
<div class="menu-bar"><button class="menu-button" type="button" aria-controls="sidebar" aria-expanded="false"><span class="menu-icon" aria-hidden="true"></span>Manual</button><span class="menu-crumb">/ ${number} ${escapeHtml(page.title)}</span></div>
<div class="doc-layout">
${sidebar(pages, slug, routes)}
<main id="content" class="doc">
<p class="crumb"><a href="${first}">Manual</a> / ${number}</p>
${inlineToc(page)}
<h1>${escapeHtml(page.title)}</h1>
<article class="prose">
${page.html}
</article>
<footer class="doc-footer">${pager(pages, index, routes)}<p class="doc-source"><button class="copy-page" type="button" data-markdown="${markdown}">Copy as Markdown</button><a href="${markdown}">View as Markdown</a>${edit}</p></footer>
</main>
${rail(page)}
</div>
${footer(options)}`;
  return document(
    {
      title: `${page.title} · ${options.title}`,
      description: page.summary,
      body,
      markdown,
      social: {
        site: options.title,
        title: page.title,
        url: routes.absolute(routes.page(slug)),
        image: shareImage(options, routes, slug),
      },
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

/**
 * The home page's text. An island that ends `index.md` stands beside the text
 * instead of under it.
 */
function homeMain(home: RenderedPage, options: ResolvedOptions): string {
  const heading = `<h1>${escapeHtml(home.title || options.title)}</h1>`;
  const { body, island } = trailingIsland(home.html);
  if (!island)
    return `<main id="content" class="home">${heading}<div class="prose">
${home.html}</div></main>`;
  return `<main id="content" class="home home-split"><div class="home-text">${heading}<div class="prose">
${body}</div></div>${islandElement(island)}</main>`;
}

/** The home page: the docs folder's `index.md`, or a link to the manual. */
export function homePage(
  input: HomePageInput & { home?: RenderedPage },
): string {
  const { options, routes, pages, home } = input;
  const first = routes.page(pages[0]?.slug ?? "");
  const main = home
    ? homeMain(home, options)
    : `<main id="content" class="not-found"><h1>${escapeHtml(options.title)}</h1><p><a href="${first}">Read the manual</a></p></main>`;
  const body = `${header(options, routes, pages, false)}
${main}
${footer(options)}`;
  return document(
    {
      title: options.title,
      description: options.description || home?.summary || "",
      body,
      markdown: home ? routes.markdown() : undefined,
      social: {
        site: options.title,
        title: options.title,
        url: routes.absolute(routes.home),
        image: shareImage(options, routes),
      },
    },
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
  const body = `${header(options, routes, pages, false)}
<main id="content" class="not-found"><h1>Page not found</h1><p>These pages exist:</p><ul>${items}</ul></main>
${footer(options)}`;
  return document(
    { title: `Page not found · ${options.title}`, description: "", body },
    input.assets,
  );
}
