# Pages for agents

The build writes every page a second time as Markdown, for AI agents and other
tools that read text:

```sh
curl https://folio.rising.sh/docs/options.md
```

```markdown
---
title: "Options"
description: "Set options in the folio field of package.json:"
url: "https://folio.rising.sh/docs/options"
---

# Options

Set options in the `folio` field of `package.json`:
```

| Path             | Holds                                                             |
| ---------------- | ----------------------------------------------------------------- |
| `docs/<slug>.md` | One manual page.                                                  |
| `index.md`       | The home page, when the docs folder has `index.md`.               |
| `llms.txt`       | The manual's index in the [llms.txt](https://llmstxt.org) format. |
| `llms-full.txt`  | Every manual page in one file, in the manual's order.             |

Each file is the page's own markdown with three changes. A link to another
manual page points to that page's `.md` file, and an image points to the address
the site serves it at. Both are full URLs when the site has a
[`url`](options.md). An island becomes a line that links to the web page, which
runs it.

Each HTML page names its Markdown in a
`<link rel="alternate" type="text/markdown">` tag. Under each manual page, Copy
as Markdown puts the page's Markdown on the clipboard, and View as Markdown
opens it.

A Vite project with its own `public/llms.txt`, or any other of these files,
keeps that file instead.

## Markdown from the page's own address

An agent that sends `Accept: text/markdown` gets the Markdown from the page's
own address. Claude Code and OpenCode send it:

```sh
curl -H 'Accept: text/markdown' https://folio.rising.sh/docs/options
```

The answer carries `Content-Type: text/markdown` and `Vary: Accept`. A browser
or a plain `curl` asks for any type with `*/*`, which keeps the HTML.

`bun run docs:dev` answers this way. A static host serves one file for each
path, so it needs a function in front of it. On Cloudflare Workers,
`@risinghq/folio/negotiate` holds the choice with no other dependency:

```ts
import { markdownPath, prefersMarkdown } from "@risinghq/folio/negotiate";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const markdown = prefersMarkdown(request.headers.get("Accept"))
      ? markdownPath(url.pathname)
      : undefined;
    if (markdown) {
      const response = await env.ASSETS.fetch(new URL(markdown, url));
      if (response.ok) return response;
    }
    return env.ASSETS.fetch(request);
  },
};
```

`markdownPath` takes the site's base as a second argument. folio's own site runs
this in
[`site/worker.ts`](https://github.com/risinghq/folio/blob/master/site/worker.ts),
which also sets the headers above. Its
[`site/wrangler.jsonc`](https://github.com/risinghq/folio/blob/master/site/wrangler.jsonc)
binds the assets as `ASSETS` and runs the Worker first for `/` and `/docs/*`.
