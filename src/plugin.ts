import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";

import type { Plugin, ResolvedConfig, Rolldown, ViteDevServer } from "vite";

import {
  homePage,
  manualPage,
  notFoundPage,
  routesFor,
  type Assets,
  type Routes,
} from "./layout.ts";
import { docsFile, escapeHtml } from "./markdown.ts";
import { renderCard } from "./og.ts";
import {
  resolveOptions,
  type FolioOptions,
  type PackageInfo,
  type ResolvedOptions,
} from "./options.ts";
import { loadSite, type Site } from "./site.ts";

const entryId = "virtual:folio/entry";
const resolvedEntryId = `\0${entryId}`;
const require = createRequire(import.meta.url);
export function entryModule(root: string, options: ResolvedOptions): string {
  const islands = options.islands
    ? `import islands from ${JSON.stringify(isAbsolute(options.islands) ? options.islands : resolve(root, options.islands))};`
    : "const islands = {};";
  const font = (name: string) =>
    `import ${JSON.stringify(require.resolve(name))};`;
  return [
    font("@fontsource-variable/figtree"),
    font("@fontsource-variable/geist-mono"),
    `import "@risinghq/folio/theme.css";`,
    `import { start } from "@risinghq/folio/client";`,
    islands,
    `start(islands);`,
  ].join("\n");
}

/** The nearest `package.json` at or above `dir`, or none. */
export function readPackage(dir: string): PackageInfo {
  for (let current = dir; ; current = dirname(current)) {
    const file = join(current, "package.json");
    if (existsSync(file))
      return JSON.parse(readFileSync(file, "utf8")) as PackageInfo;
    if (dirname(current) === current) return {};
  }
}

type Route =
  | { kind: "home" }
  | { kind: "page"; slug: string }
  | { kind: "file"; path: string }
  | { kind: "missing" };

/** Matches a request path below `base` to a route; null means not a page request. */
export function matchRoute(path: string, base: string): Route | null {
  if (!path.startsWith(base)) return null;
  const rest = path.slice(base.length).replace(/\/$/, "");
  if (rest === "" || rest === "index.html") return { kind: "home" };
  const page = /^docs\/([a-z0-9-]+)(?:\.html|\/index\.html)?$/.exec(rest);
  if (page) return { kind: "page", slug: page[1] ?? "" };
  const file = docsFile.exec(rest.slice("docs/".length));
  if (rest.startsWith("docs/") && file)
    return { kind: "file", path: file[1] ?? "" };
  if (rest.startsWith("docs/") || rest === "docs") return { kind: "missing" };
  return null;
}

const mediaTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  avif: "image/avif",
};

/** Preloads the Latin text and code faces, which every page paints with first. */
function fontPreloads(bundle: Rolldown.OutputBundle, base: string): string[] {
  return Object.values(bundle)
    .filter(
      (file) =>
        file.type === "asset" &&
        /\/(?:figtree|geist-mono)-latin-wght-normal-[\w-]+\.woff2$/.test(
          file.fileName,
        ),
    )
    .map(
      (file) =>
        `<link rel="preload" href="${base}${file.fileName}" as="font" type="font/woff2" crossorigin>`,
    );
}

/**
 * Prerenders a page of the site when the reader hovers or presses its link,
 * so the click shows it at once. Browsers without speculation rules ignore it.
 */
function speculationRules(base: string): string {
  const rules = {
    prerender: [{ where: { href_matches: `${base}*` }, eagerness: "moderate" }],
  };
  return `<script type="speculationrules">${JSON.stringify(rules)}</script>`;
}

/**
 * Cloudflare and Netlify read `_headers`. Hashed assets never change, so a
 * browser keeps them instead of revalidating each one on every page.
 */
function cacheHeaders(base: string, assetsDir: string): string {
  return `${base}${assetsDir}/*\n  Cache-Control: public, max-age=31536000, immutable\n`;
}

/** The home page and every manual page, for search engines. */
function sitemap(routes: Routes, site: Site): string {
  const urls = [routes.home, ...site.pages.map((p) => routes.page(p.slug))]
    .map(
      (path) =>
        `<url><loc>${escapeHtml(routes.absolute(path) ?? path)}</loc></url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function robots(routes: Routes): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${routes.absolute(`${routes.home}sitemap.xml`)}\n`;
}

/** The social card of the home page and of each manual page. */
function cards(options: ResolvedOptions, routes: Routes, site: Site) {
  const host = options.url ? new URL(options.url).host : undefined;
  const home = {
    path: routes.card(),
    card: {
      title: options.title,
      summary: options.description || site.home?.summary || "",
      host,
    },
  };
  const pages = site.pages.map((page) => ({
    path: routes.card(page.slug),
    card: {
      site: options.title,
      title: page.title,
      summary: site.rendered.get(page.slug)?.summary ?? "",
      host,
    },
  }));
  return [home, ...pages];
}

function renderRoute(
  route: Route,
  site: Site,
  options: ResolvedOptions,
  base: string,
  assets: Assets,
) {
  const routes = routesFor(base, options.url);
  const shared = { options, routes, pages: site.pages, assets };
  if (route.kind === "home")
    return { status: 200, html: homePage({ ...shared, home: site.home }) };
  const page =
    route.kind === "page" ? site.rendered.get(route.slug) : undefined;
  if (route.kind === "page" && page) {
    return {
      status: 200,
      html: manualPage({ ...shared, slug: route.slug, page }),
    };
  }
  return { status: 404, html: notFoundPage(shared) };
}

interface Response {
  status: number;
  type: string;
  body: string | Buffer;
}

export function folio(input: FolioOptions = {}): Plugin {
  let options: ResolvedOptions;
  let config: ResolvedConfig;

  async function serve(
    server: ViteDevServer,
    url: string,
  ): Promise<Response | null> {
    const path = decodeURIComponent(url.split(/[?#]/)[0] ?? "");
    const route = matchRoute(path, config.base);
    if (!route) return null;
    const site = await loadSite(
      config.root,
      options,
      routesFor(config.base, options.url),
    );
    if (route.kind === "file") {
      if (!site.files.includes(route.path)) return null;
      return {
        status: 200,
        type: mediaTypes[extname(route.path).slice(1)] ?? "",
        body: await readFile(join(config.root, options.docs, route.path)),
      };
    }
    // transformIndexHtml adds the base to this path.
    const assets = {
      head: `<script type="module" src="/@id/${entryId}"></script>`,
    };
    const { status, html } = renderRoute(
      route,
      site,
      options,
      config.base,
      assets,
    );
    return {
      status,
      type: "text/html; charset=utf-8",
      body: await server.transformIndexHtml(url, html),
    };
  }

  return {
    name: "folio",
    config() {
      return {
        // MPA lets `vite preview` serve the emitted pages the way GitHub
        // Pages does: `docs/x/index.html`, `docs/x.html`, else a 404.
        appType: "mpa",
        build: { rolldownOptions: { input: { folio: entryId } } },
      };
    },
    configResolved(resolved) {
      config = resolved;
      options = resolveOptions(input, readPackage(resolved.root));
    },
    resolveId(id) {
      return id === entryId ? resolvedEntryId : null;
    },
    load(id) {
      return id === resolvedEntryId ? entryModule(config.root, options) : null;
    },
    configureServer(server) {
      const docs = join(config.root, options.docs);
      server.watcher.add(docs);
      server.watcher.on("change", (file) => {
        if (file.startsWith(docs)) server.ws.send({ type: "full-reload" });
      });
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "GET" || !req.url) return next();
        let response: Response | null;
        try {
          response = await serve(server, req.url);
        } catch (error) {
          return next(error);
        }
        if (!response) return next();
        res.statusCode = response.status;
        res.setHeader("Content-Type", response.type);
        res.end(response.body);
      });
    },
    async generateBundle(_, bundle) {
      const entry = Object.values(bundle).find(
        (chunk) =>
          chunk.type === "chunk" &&
          chunk.isEntry &&
          chunk.facadeModuleId === resolvedEntryId,
      );
      if (!entry || entry.type !== "chunk")
        throw new Error("folio: the client entry was not built");
      const css = [...(entry.viteMetadata?.importedCss ?? [])];
      const head = [
        ...fontPreloads(bundle, config.base),
        ...css.map(
          (file) => `<link rel="stylesheet" href="${config.base}${file}">`,
        ),
        `<script type="module" src="${config.base}${entry.fileName}"></script>`,
        speculationRules(config.base),
      ].join("\n");
      const routes = routesFor(config.base, options.url);
      const site = await loadSite(config.root, options, routes);
      const emit = (fileName: string, source: string | Uint8Array) =>
        this.emitFile({ type: "asset", fileName, source });
      const own = (file: string) =>
        Boolean(config.publicDir && existsSync(join(config.publicDir, file)));
      if (options.url) {
        if (!own("sitemap.xml")) emit("sitemap.xml", sitemap(routes, site));
        // Crawlers read robots.txt only at the host's root.
        if (config.base === "/" && !own("robots.txt"))
          emit("robots.txt", robots(routes));
        if (options.ogImage === undefined) {
          const drawn = cards(options, routes, site);
          const images = await Promise.all(
            drawn.map(({ card }) => renderCard(card)),
          );
          drawn.forEach(({ path }, i) =>
            emit(path.slice(routes.home.length), images[i]!),
          );
        }
      }
      const sources = await Promise.all(
        site.files.map((file) =>
          readFile(join(config.root, options.docs, file)),
        ),
      );
      site.files.forEach((file, i) => emit(`docs/${file}`, sources[i]!));
      if (config.base.startsWith("/") && !own("_headers")) {
        emit("_headers", cacheHeaders(config.base, config.build.assetsDir));
      }
      const assets = { head };
      emit(
        "index.html",
        renderRoute({ kind: "home" }, site, options, config.base, assets).html,
      );
      emit(
        "404.html",
        renderRoute({ kind: "missing" }, site, options, config.base, assets)
          .html,
      );
      for (const page of site.pages) {
        const { html } = renderRoute(
          { kind: "page", slug: page.slug },
          site,
          options,
          config.base,
          assets,
        );
        emit(`docs/${page.slug}/index.html`, html);
        emit(`docs/${page.slug}.html`, html);
      }
    },
  };
}
