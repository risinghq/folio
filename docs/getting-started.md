# Getting started

Run three commands in a package's folder:

```sh
bun add -d https://github.com/risinghq/folio/releases/latest/download/folio.tgz
bunx folio init
bun run docs:dev
```

The first installs folio with Vite and Solid. The second writes a starter manual
and three scripts. The third serves the site at `localhost:5173` and re-renders
a page when a file in `docs/` changes.

## What init writes

`folio init` creates each of these that does not exist yet:

```text
docs/README.md            the index: its first list orders the pages
docs/index.md             the home page
docs/getting-started.md   the first page
```

It adds `docs:dev`, `docs:build` and `docs:preview` to `package.json`, and
`.folio` to `.gitignore`. `bun run docs:build` writes the static site to
`.folio/`. [Build and host](build-and-host.md) covers deploying it.

The site's title, version, description and GitHub link come from `package.json`.
[Options](options.md) lists what else to set.

## Pin a version

`releases/latest` installs the newest release. To pin one, name its tag:

```sh
bun add -d https://github.com/risinghq/folio/releases/download/v0.2.0/folio.tgz
```

The [releases page](https://github.com/risinghq/folio/releases) lists every
version.

## With your own Vite config

A project that already builds with Vite, or whose islands need a Vite plugin
such as `vite-plugin-solid` for JSX, adds folio to its config instead:

```ts
// vite.config.ts
import { folio } from "@risinghq/folio";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [folio({ islands: "src/islands.ts" })],
});
```

Then `vite` serves the site and `vite build` writes it to Vite's `outDir`. The
`folio` commands ignore a Vite config.
