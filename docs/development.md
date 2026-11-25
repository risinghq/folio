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
3. Merge, then push the tag `vX.Y.Z`.

The release workflow refuses a tag that does not match `package.json`. It checks
the package and packs it. It installs the tarball in an empty project, runs
`folio init` and builds the starter site. Then it attaches the tarball to the
tag's GitHub release twice: under its `npm pack` name and as `folio.tgz`, the
name the `releases/latest` install URL uses.

## The screenshot

The README shows `docs/images/screenshot.png`: the Write the manual page of this
site, in the light theme, at 1280 by 800 CSS pixels and a device scale of 2.
Retake it when the theme changes.
