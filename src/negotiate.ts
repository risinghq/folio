/**
 * Whether an `Accept` header ranks Markdown above HTML. A wildcard counts for
 * HTML: it says the client takes anything, not that it wants Markdown, so
 * browsers and `curl` keep getting the page.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  let markdown = 0;
  let html = 0;
  for (const range of accept.split(",")) {
    const [type = "", ...params] = range.split(";");
    const media = type.trim().toLowerCase();
    const q = params
      .map((param) => /^\s*q\s*=\s*([\d.]+)\s*$/i.exec(param)?.[1])
      .find((value) => value !== undefined);
    const quality = q === undefined ? 1 : Number(q);
    if (!(quality > 0)) continue;
    if (media === "text/markdown" || media === "text/x-markdown") {
      markdown = Math.max(markdown, quality);
    } else if (
      media === "text/html" ||
      media === "application/xhtml+xml" ||
      media === "text/*" ||
      media === "*/*"
    ) {
      html = Math.max(html, quality);
    }
  }
  return markdown > 0 && markdown >= html;
}

/**
 * A manual page's path under the base: `docs/<slug>`, `.html` or
 * `/index.html`. The folders match lazily, so `/index.html` is not read as
 * part of the slug.
 */
export const pageRoute =
  /^docs\/((?:[a-z0-9-]+\/)*?[a-z0-9-]+)(?:\.html|\/index\.html)?$/;

/**
 * The Markdown file of the page a path under `base` opens: `index.md` for the
 * home page and `docs/<slug>.md` for a manual page. None for any other path.
 */
export function markdownPath(path: string, base = "/"): string | undefined {
  const root = base.endsWith("/") ? base : `${base}/`;
  if (!path.startsWith(root) && `${path}/` !== root) return undefined;
  const rest = path.slice(root.length).replace(/\/$/, "");
  if (rest === "" || rest === "index.html") return `${root}index.md`;
  const page = pageRoute.exec(rest);
  return page ? `${root}docs/${page[1]}.md` : undefined;
}
