folio 0.2.1 is out.

This release makes page changes faster and sets the text in Figtree.

## Faster page changes

- The build writes `_headers`, which Cloudflare and Netlify read. It tells
  browsers to keep the hashed files in `assets/` for a year, so a page change no
  longer revalidates every script, stylesheet and font. A Vite project with its
  own `public/_headers` keeps that file instead.
- Each page prerenders a link when the reader hovers over it, so the next page
  appears as soon as they click. Browsers without speculation rules prefetch the
  page instead.
- A page change cross-fades where the browser supports view transitions and the
  reader allows motion.

## Figtree

Text is set in Figtree; code stays in Geist Mono. The local fallback is scaled
to Figtree's metrics, so the swap still does not move the page.

## Upgrade

```sh
bun add -d https://github.com/risinghq/folio/releases/download/v0.2.1/folio.tgz
```
