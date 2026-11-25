import { Marked, type Tokens } from "marked";

/** A page of the manual. `slug` names the file in the docs folder and the route. */
export interface PageEntry {
  /** The page's path in the docs folder without `.md`, such as `guide/start`. */
  slug: string;
  title: string;
  /** The heading of the index above the page's list. */
  group?: string;
}

/** A link to a page: lowercase folders and a file name, joined by `/`, then `.md`. */
const pageLink = /^(?:\.\/)?((?:[a-z0-9-]+\/)*[a-z0-9-]+)\.md$/;

/**
 * The pages a docs index lists, in its order. Each item of every list links
 * to `<slug>.md`, and the link text is the page title. A heading names the
 * group of the lists below it. A page the index does not list is not part
 * of the site.
 */
export function readManual(
  index: string,
  source = "docs/README.md",
): PageEntry[] {
  const pages: PageEntry[] = [];
  let group: string | undefined;
  for (const token of new Marked().lexer(index)) {
    if (token.type === "heading" && token.depth > 1)
      group = (token as Tokens.Heading).text.replaceAll("`", "");
    if (token.type !== "list") continue;
    for (const item of (token as Tokens.List).items) {
      const link = item.tokens
        .flatMap((child) => (child.type === "text" ? (child.tokens ?? []) : []))
        .find((child): child is Tokens.Link => child.type === "link");
      const slug = pageLink.exec(link?.href ?? "")?.[1];
      if (!link || !slug) {
        throw new Error(`${source}: "${item.text}" does not link to a page`);
      }
      const title = link.text.replaceAll("`", "");
      pages.push(group ? { slug, title, group } : { slug, title });
    }
  }
  if (pages.length === 0) throw new Error(`${source} has no list of pages`);
  return pages;
}

/** The pages in runs that share a group, in order. */
export function groupPages(
  pages: PageEntry[],
): { group?: string; pages: PageEntry[] }[] {
  const runs: { group?: string; pages: PageEntry[] }[] = [];
  for (const page of pages) {
    const last = runs.at(-1);
    if (last && last.group === page.group) last.pages.push(page);
    else runs.push({ group: page.group, pages: [page] });
  }
  return runs;
}
