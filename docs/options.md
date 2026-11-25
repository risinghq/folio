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

| Option        | Default                    | Effect                                                             |
| ------------- | -------------------------- | ------------------------------------------------------------------ |
| `title`       | `name`, without its scope  | The project name: the header brand and each page title's suffix.   |
| `version`     | `version`                  | The version shown beside the brand.                                |
| `description` | `description`              | The home page's meta description.                                  |
| `repository`  | `repository`, as a web URL | The repository's address. Adds the GitHub link and Edit this page. |
| `docs`        | `"docs"`                   | The manual's folder, relative to the Vite root.                    |
| `branch`      | `"master"`                 | The branch Edit this page opens.                                   |
| `docsPath`    | `"docs"`                   | The docs folder's path inside the repository.                      |
| `islands`     | —                          | A module mapping island names to loaders.                          |
| `nav`         | `[]`                       | Extra header links, after "Manual".                                |
| `footer`      | `""`                       | A footer line, as HTML.                                            |

The defaults in code font are `package.json` fields of the nearest package above
the Vite root. `repository` accepts `o/r`, `github:o/r`, and `git+https`,
`git://` and `git@` URLs.

## A site in a subfolder

When the Vite config lives in a subfolder, point `docs` at the manual and keep
`docsPath` as its path in the repository. folio's own site does this in
[`site/vite.config.ts`](https://github.com/risinghq/folio/blob/master/site/vite.config.ts):

```ts
folio({ docs: "../docs", islands: "src/islands.ts" });
```
