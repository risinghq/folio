# Build and host

`vite build` writes a static site to `dist/`:

```text
dist/
  index.html
  404.html
  docs/getting-started.html
  docs/getting-started/index.html
  assets/...
```

Each page is written twice, as `docs/<slug>.html` and `docs/<slug>/index.html`,
so `docs/<slug>` opens on a host that maps either form. Every other path should
serve `404.html`, which lists the manual's pages.

## A site under a path

Set Vite's `base` when the site is not at the root of its domain. folio keeps
every link and asset under it:

```ts
export default defineConfig({
  base: "/my-package/",
  plugins: [folio({ title: "my-package" })],
});
```

## Preview the build

```sh
bunx vite preview
```

The preview serves the emitted files the way a static host does, including the
404 page.

## Hosts

GitHub Pages serves `dist/` as built. On Cloudflare Workers, serve it as static
assets with `not_found_handling` set to `404-page`; folio's own site does this
in
[`site/wrangler.jsonc`](https://github.com/risinghq/folio/blob/master/site/wrangler.jsonc).
