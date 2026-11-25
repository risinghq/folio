# folio

folio builds a documentation site from a repository's `docs/` folder. A Vite
plugin renders each manual page as static HTML, mounts Solid islands for live
demos, and serves an optional landing island at `/`.

## Install

Each version tag publishes a GitHub release whose asset is the `npm pack`
tarball. Install it by the asset's URL:

```sh
bun add @risinghq/folio@https://github.com/risinghq/folio/releases/download/v0.1.0/risinghq-folio-0.1.0.tgz
```

## Usage

Add the `folio` plugin to the site's Vite config:

```ts
// vite.config.ts
import { folio } from "@risinghq/folio";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    folio({
      title: "my-package",
      repository: "https://github.com/o/my-package",
      islands: "src/islands.ts",
      landing: "hero",
    }),
  ],
});
```

`vite` serves the site while editing; `vite build` writes it to `dist/` as
static files a file host can serve.

The manual is the `docs` folder. Its `docs/README.md` holds the index: the first
list links to each page's file, and the link text is the page title. A page the
index does not list is not part of the site.

```md
- [Getting started](getting-started.md)
- [`createThing`](create-thing.md)
```

A `<!-- island NAME -->` comment on its own line in a page mounts the island
`NAME` there. The `islands` option names a module whose default export maps each
island name to a loader of the Solid component it mounts:

```ts
// src/islands.ts
export default {
  counter: () => import("./counter.ts"),
  hero: () => import("./hero.ts"),
};
```

An island mounts when it nears the viewport. The `landing` island mounts eagerly
as the home page; with no `landing`, `/` links to the manual's first page.

The build emits `index.html`, `404.html`, and both `docs/<slug>/index.html` and
`docs/<slug>.html` for each page, so the site opens `docs/<slug>` either way.
Links inside the site stay under Vite's `base`.

## Options

`folio` takes a `FolioOptions` object:

| Option        | Default    | Effect                                                             |
| ------------- | ---------- | ------------------------------------------------------------------ |
| `title`       | —          | The project name: the header brand and each page title's suffix.   |
| `version`     | —          | The version shown beside the brand.                                |
| `description` | `""`       | The home page's meta description.                                  |
| `docs`        | `"docs"`   | The manual's folder, relative to the Vite root.                    |
| `repository`  | —          | The repository's address. Adds the GitHub link and Edit this page. |
| `branch`      | `"master"` | The branch Edit this page opens.                                   |
| `docsPath`    | `"docs"`   | The docs folder's path inside the repository.                      |
| `islands`     | —          | A module mapping island names to loaders.                          |
| `landing`     | —          | The island the home page mounts.                                   |
| `nav`         | `[]`       | Extra header links, after "Manual".                                |
| `footer`      | `""`       | A footer line, as HTML.                                            |

## Features

- Code blocks are highlighted by Shiki and get a copy button.
- A page's `##` and `###` headings build its table of contents.
- A link to another manual page (`x.md`) becomes its route. With `repository`
  set, a link to any other `.md` file opens its source there.
- Light and dark themes; the choice persists across pages.
