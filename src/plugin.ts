import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";

import {
  homePage,
  manualPage,
  notFoundPage,
  routesFor,
  type Assets,
} from "./layout.ts";
import {
  resolveOptions,
  type FolioOptions,
  type ResolvedOptions,
} from "./options.ts";
import { loadSite, type Site } from "./site.ts";

const entryId = "virtual:folio/entry";
const resolvedEntryId = `\0${entryId}`;
const packageFile = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

/** The client entry: theme, fonts, the project's islands, then the runtime. */
function entryModule(root: string, options: ResolvedOptions): string {
  const islands = options.islands
    ? `import islands from ${JSON.stringify(isAbsolute(options.islands) ? options.islands : resolve(root, options.islands))};`
    : "const islands = {};";
  return [
    `import "@fontsource-variable/geist";`,
    `import "@fontsource-variable/geist-mono";`,
    `import ${JSON.stringify(packageFile("../theme/theme.css"))};`,
    `import { start } from ${JSON.stringify(packageFile("./client/index.ts"))};`,
    islands,
    `start(islands);`,
  ].join("\n");
}

type Route =
  | { kind: "home" }
  | { kind: "page"; slug: string }
  | { kind: "missing" };

/** Matches a request path below `base` to a route; null means not a page request. */
export function matchRoute(path: string, base: string): Route | null {
  if (!path.startsWith(base)) return null;
  const rest = path.slice(base.length).replace(/\/$/, "");
  if (rest === "" || rest === "index.html") return { kind: "home" };
  const page = /^docs\/([a-z0-9-]+)(?:\.html|\/index\.html)?$/.exec(rest);
  if (page) return { kind: "page", slug: page[1] ?? "" };
  if (rest.startsWith("docs/") || rest === "docs") return { kind: "missing" };
  return null;
}

/** The file `generateBundle` writes for a route. */
function builtFile(route: Route): string {
  if (route.kind === "home") return "index.html";
  if (route.kind === "page") return `docs/${route.slug}/index.html`;
  return "404.html";
}

function renderRoute(
  route: Route,
  site: Site,
  options: ResolvedOptions,
  base: string,
  assets: Assets,
) {
  const routes = routesFor(base);
  const shared = { options, routes, pages: site.pages, assets };
  if (route.kind === "home") return { status: 200, html: homePage(shared) };
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

export function folio(input: FolioOptions): Plugin {
  const options = resolveOptions(input);
  let config: ResolvedConfig;

  async function serve(server: ViteDevServer, url: string) {
    const path = decodeURIComponent(url.split(/[?#]/)[0] ?? "");
    const route = matchRoute(path, config.base);
    if (!route) return null;
    const site = await loadSite(config.root, options, routesFor(config.base));
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
    return { status, html: await server.transformIndexHtml(url, html) };
  }

  return {
    name: "folio",
    config() {
      return {
        appType: "custom",
        build: { rolldownOptions: { input: { folio: entryId } } },
      };
    },
    configResolved(resolved) {
      config = resolved;
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
        if (file.startsWith(docs) && file.endsWith(".md"))
          server.ws.send({ type: "full-reload" });
      });
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "GET" || !req.url) return next();
        let page: Awaited<ReturnType<typeof serve>>;
        try {
          page = await serve(server, req.url);
        } catch (error) {
          return next(error);
        }
        if (!page) return next();
        res.statusCode = page.status;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(page.html);
      });
    },
    configurePreviewServer(server) {
      const outDir = resolve(config.root, config.build.outDir);
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "GET" || !req.url) return next();
        const route = matchRoute(
          decodeURIComponent(req.url.split(/[?#]/)[0] ?? ""),
          config.base,
        );
        if (!route) return next();
        let html: string;
        try {
          html = await readFile(join(outDir, builtFile(route)), "utf8");
        } catch {
          html = await readFile(join(outDir, "404.html"), "utf8");
          res.statusCode = 404;
        }
        if (route.kind === "missing") res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
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
        ...css.map(
          (file) => `<link rel="stylesheet" href="${config.base}${file}">`,
        ),
        `<script type="module" src="${config.base}${entry.fileName}"></script>`,
      ].join("\n");
      const site = await loadSite(config.root, options, routesFor(config.base));
      const emit = (fileName: string, source: string) =>
        this.emitFile({ type: "asset", fileName, source });
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
