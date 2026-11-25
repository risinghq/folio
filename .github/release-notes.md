folio 0.1.0 is out.

This is the first release. folio builds a documentation site from a repository's
`docs/` folder: a Vite plugin renders each manual page as static HTML, mounts
Solid islands for live demos and serves an optional landing island at `/`.

Install it from this release's tarball:

```
bun add @risinghq/folio@https://github.com/risinghq/folio/releases/download/v0.1.0/risinghq-folio-0.1.0.tgz
```

Then add the `folio` plugin to the site's Vite config. The readme covers the
options, the `<!-- island NAME -->` marker and the routes the build emits.

There is no npm publish yet; the release asset is the only install path. Report
problems on the issue tracker.

The changes: the plugin builds every route as static HTML (`index.html`,
`404.html`, `docs/<slug>.html` and `docs/<slug>/index.html` per page), the theme
numbers the manual's pages and folds its contents into the page on narrow
screens, and islands mount as they near the viewport. The rest is the readme, CI
and this release workflow.
