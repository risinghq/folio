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
  it("mounts the landing island", async () => {
    await page.goto(url);
    await expect(
      page.locator("[data-island=counter]").textContent(),
    ).resolves.toBe("counter mounted");
  });

  it("mounts an article island as it nears the viewport", async () => {
    await page.goto(`${url}docs/getting-started`);
    const island = page.locator(".prose [data-island=counter]");
    await island.scrollIntoViewIfNeeded();
    await island.locator("p").waitFor();
    await expect(island.textContent()).resolves.toBe("counter mounted");
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
});
