import { markdownPath, prefersMarkdown } from "../src/negotiate.ts";

interface Env {
  ASSETS: { fetch: (request: Request | URL | string) => Promise<Response> };
}

const markdownType = "text/markdown; charset=utf-8";

/** A copy of an asset response that caches apart for each `Accept`. */
function negotiated(response: Response, markdown: boolean): Response {
  const headers = new Headers(response.headers);
  headers.set("Vary", "Accept");
  if (markdown) headers.set("Content-Type", markdownType);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Serves the built site, and a page's Markdown from the page's own URL when
 * the request's `Accept` header prefers it.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const markdown = prefersMarkdown(request.headers.get("Accept"))
      ? markdownPath(url.pathname)
      : undefined;
    if (markdown) {
      const response = await env.ASSETS.fetch(new URL(markdown, url));
      if (response.ok) return negotiated(response, true);
    }
    const response = await env.ASSETS.fetch(request);
    return negotiated(response, url.pathname.endsWith(".md") && response.ok);
  },
};
