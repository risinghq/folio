# Build and host

`bun run docs:build` writes a static site to `.folio/`:

```text
.folio/
  index.html
  404.html
  docs/getting-started.html
  docs/getting-started/index.html
  docs/getting-started.md
  docs/images/...
  index.md
  llms.txt
  llms-full.txt
  assets/...
  og/index.png
  og/docs/getting-started.png
  sitemap.xml
  robots.txt
  _headers
```

The `og/` cards, `sitemap.xml` and `robots.txt` need the site's
[`url`](options.md). The `.md` and `llms` files are for agents; see
[Pages for agents](agents.md).

Each page is written twice, as `docs/<slug>.html` and `docs/<slug>/index.html`,
so `docs/<slug>` opens on a host that maps either form. Every other path should
serve `404.html`, which lists the manual's pages. A project with its own Vite
config runs `vite build`, which writes the same files to Vite's `outDir`.

## Preview the build

```sh
bun run docs:preview
```

The preview serves the built files the way a static host does, including the 404
page.

## A site under a path

Pass `--base` when the site is not at the root of its domain. folio keeps every
link and asset under it:

```sh
bunx folio build --base /my-package/
```

With a Vite config, set Vite's `base` option instead.

## Hosts

GitHub Pages serves the folder as built. On Cloudflare Workers, serve it as
static assets with `not_found_handling` set to `404-page`; folio's own site does
this in
[`site/wrangler.jsonc`](https://github.com/risinghq/folio/blob/master/site/wrangler.jsonc).

## Search engines

`sitemap.xml` lists the home page and every manual page by full address.
`robots.txt` points crawlers at it. Crawlers read `robots.txt` only at the root
of a domain, so a site under a `--base` path gets none. `404.html` asks search
engines not to index it. A Vite project with its own `public/sitemap.xml` or
`public/robots.txt` keeps that file instead.

## Page changes

Cloudflare and Netlify read `_headers`, which tells browsers to keep the hashed
files in `assets/` for a year. A Vite project with its own `public/_headers`
keeps that file instead. On other hosts, set the same header for `assets/`.

Each page prerenders a link when the reader hovers over it, so the next page
appears as soon as they click. Browsers without speculation rules prefetch the
page instead. A page change cross-fades where the browser supports view
transitions and the reader allows motion.
