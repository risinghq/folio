# folio

folio builds a documentation site from a repository's `docs/` folder. A Vite
plugin renders each manual page as static HTML, mounts Solid islands for live
demos, and serves an optional landing island at `/`. Its own manual is built
with it: [folio.rising.sh](https://folio.rising.sh).

## Install

Each version tag publishes a GitHub release whose asset is the `npm pack`
tarball. Install it by the asset's URL:

```sh
bun add @risinghq/folio@https://github.com/risinghq/folio/releases/download/v0.1.1/risinghq-folio-0.1.1.tgz
```

## Example

```ts
// vite.config.ts
import { folio } from "@risinghq/folio";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [folio({ title: "my-package" })],
});
```

`docs/README.md` lists the pages in its first list:

```md
- [Getting started](getting-started.md)
```

`vite` serves the site while editing; `vite build` writes it to `dist/`.

## Features

- One static HTML page per manual page, numbered in the index's order.
- Solid islands placed with `<!-- island NAME -->`, mounted as they near the
  viewport.
- Shiki-highlighted code blocks with a copy button.
- A table of contents from each page's `##` and `###` headings.
- Links between `.md` pages become routes; other `.md` links open on GitHub.
- Light and dark themes; the choice persists across pages.

## Links

- [Manual](https://folio.rising.sh/docs/getting-started)
- [Development and releases](docs/development.md)
