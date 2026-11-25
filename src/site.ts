import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { imageSize } from "image-size";

import type { Routes } from "./layout.ts";
import { readManual, type PageEntry } from "./manual.ts";
import { renderPage, type RenderedPage } from "./markdown.ts";
import { repositoryFileUrl, type ResolvedOptions } from "./options.ts";

export interface Site {
  pages: PageEntry[];
  rendered: Map<string, RenderedPage>;
  /** Each manual page's markdown, by slug. */
  sources: Map<string, string>;
  /** `index.md` of the docs folder: the home page, when it exists. */
  home?: RenderedPage;
  homeSource?: string;
  /** Every docs folder file a page or the home page shows. */
  files: string[];
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function readImageSize(
  dir: string,
  file: string,
): { width: number; height: number } {
  let source: Buffer;
  try {
    source = readFileSync(join(dir, file));
  } catch {
    throw new Error(`folio: the image ${file} is not in ${dir}`);
  }
  const { width, height } = imageSize(source);
  return { width, height };
}

/** A docs folder file on the repository's web host, or its bare name with no repository. */
export function docsSourceUrl(options: ResolvedOptions, file: string): string {
  return repositoryFileUrl(options, "blob", file) ?? file;
}

/** Reads the docs folder's index and renders every page it lists, and the home page. */
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
  const sourceUrl = (file: string) => docsSourceUrl(options, file);
  const context = {
    pages,
    pageUrl: routes.page,
    sourceUrl,
    fileUrl: routes.file,
    imageSize: (file: string) => readImageSize(dir, file),
  };
  const sources = await Promise.all(
    pages.map((page) => readFile(join(dir, `${page.slug}.md`), "utf8")),
  );
  const sourceMap = new Map(
    pages.map((page, i) => [page.slug, sources[i] ?? ""]),
  );
  const rendered = new Map<string, RenderedPage>(
    pages.map((page) => [
      page.slug,
      renderPage(sourceMap.get(page.slug) ?? "", context),
    ]),
  );
  const homeSource = await readOptional(join(dir, "index.md"));
  const home =
    homeSource === undefined
      ? undefined
      : renderPage(homeSource, { ...context, actions: true });
  const files = [
    ...new Set(
      [...rendered.values(), ...(home ? [home] : [])].flatMap(
        (page) => page.files,
      ),
    ),
  ];
  return { pages, rendered, sources: sourceMap, home, homeSource, files };
}
