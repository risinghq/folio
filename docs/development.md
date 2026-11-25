# Development

folio uses the Bun and Node versions in `mise.toml`.

```sh
bun install
bun run check
```

`check` runs oxlint and oxfmt, the typecheck, the package build and the tests.
`bun run fix` applies the linter's and formatter's fixes.

## This site

The `site` folder builds this manual with folio's own source:

```sh
bun run site          # serve it while editing
bun run build:site    # build the package, then the site into site/dist
```

`.github/workflows/site.yml` builds the site on every pull request and deploys
it to folio.rising.sh on a push to `master`.

## Release

1. Set `version` in `package.json`.
2. Start `.github/release-notes.md` with `folio X.Y.Z is out.`
3. Update the install URL in `README.md` and `docs/getting-started.md`.
4. Merge, then push the tag `vX.Y.Z`.

The release workflow refuses a tag that does not match `package.json`. It checks
the package, packs it, installs the tarball in an empty project, and attaches
the tarball to the tag's GitHub release.
