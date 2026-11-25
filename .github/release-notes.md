folio 0.0.1 is out.

folio builds a documentation site from a repository's `docs/` folder: one static
HTML page per manual page, Solid islands for live demos, and a markdown home
page.

```sh
bun add -d https://github.com/risinghq/folio/releases/download/v0.0.1/folio.tgz
bunx folio init
bun run docs:dev
```

- A `folio` command runs the site with no Vite config: `init`, `dev`, `build`
  and `preview`. Options default to the fields of `package.json`; others go in
  its `folio` field.
- `docs/index.md` is the home page. A paragraph of links in it becomes a row of
  buttons.
- Text is set in Figtree and code in Geist Mono. The fonts are preloaded with a
  metric-matched fallback, so they do not move the page as they load.
- The build writes `_headers` to cache hashed assets for a year, and each page
  prerenders a link when the reader hovers over it.
