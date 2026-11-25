# Build and host

`bun run docs:build` writes a static site to `.folio/`:

```text
.folio/
  index.html
  404.html
  docs/getting-started.html
  docs/getting-started/index.html
  docs/images/...
  assets/...
```

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
