folio 0.2.0 is out.

This release makes folio quicker to start and steadier to load.

## Start in three commands

```sh
bun add -d https://github.com/risinghq/folio/releases/latest/download/folio.tgz
bunx folio init
bun run docs:dev
```

- A `folio` command runs the site with no Vite config: `init`, `dev`, `build`
  and `preview`. `init` writes a starter manual and the `docs:dev`, `docs:build`
  and `docs:preview` scripts. `build` writes to `.folio/`.
- Each release attaches the tarball as `folio.tgz` too, so the `releases/latest`
  URL above always installs the newest version.
- `title`, `version`, `description` and `repository` default to the fields of
  `package.json`. Other options go in its `folio` field.

## A home page in markdown

`docs/index.md` is the home page. A paragraph of links in it becomes a row of
buttons, and islands work there as on any page. Pages can show images from the
docs folder; the build copies them, and each `<img>` carries its width and
height.

## No shift while fonts load

The site preloads the Latin Geist fonts and sets text in a local fallback scaled
to Geist's metrics, so the swap does not move the page.

## Breaking changes

- The `landing` option is gone. Move the landing island's content to
  `docs/index.md`, and place an island there with `<!-- island NAME -->` if it
  needs one.
- `title` is optional. A site whose `title` matched its package name can drop
  it.

## Upgrade

```sh
bun add -d https://github.com/risinghq/folio/releases/download/v0.2.0/folio.tgz
```
