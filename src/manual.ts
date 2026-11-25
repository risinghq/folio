import { Marked, type Tokens } from "marked";

/** A page of the manual. `slug` names the file in the docs folder and the route. */
export interface PageEntry {
  slug: string;
  title: string;
}

/**
 * The pages a docs index lists, in its order. Each item of the index's first
 * list links to `<slug>.md`, and the link text is the page title. A page the
 * index does not list is not part of the site.
 */
export function readManual(
  index: string,
  source = "docs/README.md",
): PageEntry[] {
  const list = new Marked()
    .lexer(index)
    .find((token): token is Tokens.List => token.type === "list");
  if (!list) throw new Error(`${source} has no list of pages`);

  return list.items.map((item) => {
    const link = item.tokens
      .flatMap((token) => (token.type === "text" ? (token.tokens ?? []) : []))
      .find((token): token is Tokens.Link => token.type === "link");
    const slug = /^([a-z0-9-]+)\.md$/.exec(link?.href ?? "")?.[1];
    if (!link || !slug) {
      throw new Error(`${source}: "${item.text}" does not link to a page`);
    }
    return { slug, title: link.text.replaceAll("`", "") };
  });
}
