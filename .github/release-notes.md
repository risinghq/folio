folio 0.1.1 is out.

This patch release follows 0.1.0 by a day. It fixes one packaging defect.

A site that installed folio with bun could not build: the generated client entry
imported `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` as
bare package names, which Vite resolves from the site's root, and bun does not
hoist a dependency's dependencies there. The plugin now resolves each font's
stylesheet from folio's own install and puts the absolute path in the entry, so
the fonts stay folio's dependencies.

## Upgrade

Install the new tarball over the old one:

```
bun add @risinghq/folio@https://github.com/risinghq/folio/releases/download/v0.1.1/risinghq-folio-0.1.1.tgz
```

A site that added the two `@fontsource-variable` packages to its own
`package.json` as a workaround can remove them.

No breaking changes and no known problems. The change list is the fix, its test
and this version bump.
