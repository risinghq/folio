import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser, type Page } from "playwright";
import { build, preview, type PreviewServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("fixture", import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), "folio-browser-"));
let server: PreviewServer;
let browser: Browser;
let page: Page;
let url: string;

beforeAll(async () => {
  await build({
    root,
    logLevel: "silent",
    build: { outDir, emptyOutDir: true },
  });
  server = await preview({
    root,
    logLevel: "silent",
    build: { outDir },
    preview: { port: 0 },
  });
  url = server.resolvedUrls?.local[0] ?? "";
  browser = await chromium.launch();
  page = await browser.newPage();
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
  rmSync(outDir, { recursive: true, force: true });
});

describe("the built site in a browser", () => {
  it("mounts an island on the home page", async () => {
    await page.goto(url);
    const island = page.locator(".home [data-island=counter]");
    await island.scrollIntoViewIfNeeded();
    await island.locator("p").waitFor();
    await expect(island.textContent()).resolves.toBe("counter mounted");
  });

  it("mounts an article island as it nears the viewport", async () => {
    await page.goto(`${url}docs/getting-started`);
    const island = page.locator(".prose [data-island=counter]");
    await island.scrollIntoViewIfNeeded();
    await island.locator("p").waitFor();
    await expect(island.textContent()).resolves.toBe("counter mounted");
  });

  // Chrome starts the prerender but stops it because DevTools is attached,
  // so the test sees the attempt, not a prerendered page.
  it("starts prerendering a page when its link is hovered", async () => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Preload.enable");
    const attempted: string[] = [];
    cdp.on("Preload.prerenderStatusUpdated", (event) =>
      attempted.push(event.key.url),
    );
    await page.goto(`${url}docs/getting-started`);
    expect(attempted).toEqual([]);
    await page.locator(".sidebar a[href$='/docs/create-thing']").hover();
    await expect.poll(() => attempted).toContain(`${url}docs/create-thing`);
    await cdp.detach();
  });

  it("keeps the chosen theme across a reload", async () => {
    await page.goto(`${url}docs/getting-started`);
    const before = await page.evaluate(
      () => document.documentElement.dataset.theme,
    );
    await page.click(".theme-toggle");
    await page.reload();
    const after = await page.evaluate(
      () => document.documentElement.dataset.theme,
    );
    expect(after).not.toBe(before);
    expect(["light", "dark"]).toContain(after);
  });

  it("copies the page's markdown to the clipboard", async () => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"], { origin: url });
    await page.goto(`${url}docs/getting-started`);
    const button = page.locator(".copy-page");
    await button.click();
    await expect.poll(() => button.textContent()).toBe("Copied");
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const served = await (await fetch(`${url}docs/getting-started.md`)).text();
    expect(copied).toBe(served);
  });
});
