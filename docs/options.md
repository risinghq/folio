# Options

Set options in the `folio` field of `package.json`:

```json
{
  "name": "my-package",
  "folio": {
    "islands": "docs/islands.ts",
    "nav": [{ "text": "Changelog", "href": "/changelog" }],
    "footer": "MIT licensed."
  }
}
```

A project with its own Vite config passes the same object to the plugin,
`folio({ islands: "src/islands.ts" })`. A plugin option overrides the
`package.json` field.

| Option        | Default                   | Effect                                                                            |
| ------------- | ------------------------- | --------------------------------------------------------------------------------- |
| `title`       | `name`, without its scope | The project name: the header brand and each page title's suffix.                  |
| `version`     | `version`                 | The version shown beside the brand.                                               |
| `description` | `description`             | The home page's meta description.                                                 |
| `repository`  | `repository`, or `origin` | The repository's address. Adds the GitHub link and Edit this page.                |
| `npm`         | `name`, unless `private`  | The npm package the header links. `false` links none.                             |
| `package`     | —                         | The documented package's folder, relative to the Vite root. See below.            |
| `docs`        | `"docs"`                  | The manual's folder, relative to the Vite root.                                   |
| `branch`      | the default branch        | The branch Edit this page opens.                                                  |
| `docsPath`    | the docs folder's path    | The docs folder's path inside the repository.                                     |
| `islands`     | —                         | A module mapping island names to loaders.                                         |
| `nav`         | `[]`                      | Extra header links, after "Manual".                                               |
| `footer`      | `""`                      | A footer line, as HTML.                                                           |
| `url`         | `homepage`                | The site's public address. Adds the sitemap, canonical links and social cards.    |
| `ogImage`     | a card per page           | The image every page shares: a URL or a path under the base. `false` shares none. |

The defaults in code font are `package.json` fields of the nearest package above
the Vite root. `repository` accepts `o/r`, `github:o/r`, and `git+https`,
`git://` and `git@` URLs. `homepage` is ignored when it points at GitHub, where
`npm init` sends it.

Without a `repository` field, folio reads the address from the git remote
`origin`, then from a GitHub Actions run. It reads `docsPath` from where the
docs folder sits in the git checkout, so set it only when the site builds
outside one.

The default branch is the one `origin/HEAD` names. A GitHub Actions checkout has
no `origin/HEAD`, so there folio reads the repository's default branch from the
workflow's event. With neither, it is `master`.

## Search and link previews

Every page carries its title and summary as Open Graph tags. With `url` set, it
also carries its canonical address and a share image, and the build writes
[`sitemap.xml`, `robots.txt` and the cards](build-and-host.md#search-engines).
Each card shows the page's title and summary on the dark theme.

## A site in a subfolder

When the Vite config lives in a subfolder, point `docs` at the manual. folio's
own site does this in
[`site/vite.config.ts`](https://github.com/risinghq/folio/blob/master/site/vite.config.ts):

```ts
folio({ docs: "../docs", islands: "src/islands.ts" });
```

## A monorepo

Run `folio` in the package's folder. Its `package.json` supplies the title,
version and npm link, and the Edit this page links open `packages/<name>/docs/…`
in the repository.

```sh
cd packages/thing
bunx folio dev
```

When the site is its own private workspace package, name the documented package
with `package`:

```json
{
  "name": "thing-site",
  "private": true,
  "folio": { "docs": "../docs", "package": "../packages/thing" }
}
```

The `folio` field stays in the site's `package.json`. Every other default comes
from the package `package` names.
