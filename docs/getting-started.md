# Getting started

Install folio from a release asset, then add its plugin to a Vite config:

```sh
bun add @risinghq/folio@https://github.com/risinghq/folio/releases/download/v0.1.1/risinghq-folio-0.1.1.tgz
bun add -d vite solid-js @solidjs/web
```

Each version tag publishes a GitHub release whose asset is the `npm pack`
tarball. The [releases page](https://github.com/risinghq/folio/releases) lists
every version.

## Configure Vite

```ts
// vite.config.ts
import { folio } from "@risinghq/folio";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    folio({
      title: "my-package",
      repository: "https://github.com/o/my-package",
    }),
  ],
});
```

`title` is the only required option. [Options](options.md) lists the rest.

## Add the manual

The manual is the `docs` folder beside the Vite config. Its `README.md` lists
the pages:

```md
# my-package manual

- [Getting started](getting-started.md)
- [`createThing`](create-thing.md)
```

Each listed file is a page. [Write the manual](write-the-manual.md) covers what
a page can hold.

## Run it

```sh
bunx vite          # serve the site while editing
bunx vite build    # write the static site to dist/
```

The dev server re-renders a page when a file in the docs folder changes.
