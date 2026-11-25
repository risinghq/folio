# Options

`folio()` takes one `FolioOptions` object. Only `title` is required.

```ts
folio({
  title: "my-package",
  version: "1.2.0",
  description: "What my-package does, in one line.",
  repository: "https://github.com/o/my-package",
  branch: "main",
  islands: "src/islands.ts",
  landing: "hero",
  nav: [{ text: "Changelog", href: "/changelog" }],
  footer: "MIT licensed.",
});
```

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

## A site in a subfolder

When the Vite config lives in a subfolder, point `docs` at the manual and keep
`docsPath` as its path in the repository. folio's own site does this:

```ts
// site/vite.config.ts
folio({
  title: "folio",
  docs: "../docs",
  repository: "https://github.com/risinghq/folio",
  islands: "src/islands.ts",
  landing: "landing",
});
```
