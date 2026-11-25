import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Routes } from "./layout.ts";
import { readManual, type PageEntry } from "./manual.ts";
import { renderPage, type RenderedPage } from "./markdown.ts";
import type { ResolvedOptions } from "./options.ts";

export interface Site {
  pages: PageEntry[];
  rendered: Map<string, RenderedPage>;
}

/** Reads the docs folder's index and renders every page it lists. */
export async function loadSite(
  root: string,
  options: ResolvedOptions,
  routes: Routes,
): Promise<Site> {
  const dir = join(root, options.docs);
  const indexPath = join(options.docs, "README.md");
  const pages = readManual(
    await readFile(join(dir, "README.md"), "utf8"),
    indexPath,
  );
  const sourceUrl = (file: string) =>
    options.repository
      ? `${options.repository}/blob/${options.branch}/${options.docsPath}/${file}`
      : file;
  const context = { pages, pageUrl: routes.page, sourceUrl };
  const sources = await Promise.all(
    pages.map((page) => readFile(join(dir, `${page.slug}.md`), "utf8")),
  );
  const rendered = new Map<string, RenderedPage>(
    pages.map((page, i) => [page.slug, renderPage(sources[i] ?? "", context)]),
  );
  return { pages, rendered };
}
