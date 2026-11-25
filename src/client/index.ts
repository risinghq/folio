import { render } from "@solidjs/web";
import { createComponent, type Component } from "solid-js";

/** Maps an island name to a loader of the module whose default export it mounts. */
export type Islands = Record<string, () => Promise<{ default: Component }>>;

const themeKey = "folio-theme";

async function copy(
  button: HTMLButtonElement,
  text: string | Promise<string>,
): Promise<void> {
  const label = button.textContent;
  // Safari copies only inside the click, so the write starts before the text
  // arrives and a ClipboardItem waits on it.
  await (typeof text === "string"
    ? navigator.clipboard.writeText(text)
    : navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": text.then(
            (body) => new Blob([body], { type: "text/plain" }),
          ),
        }),
      ]));
  button.textContent = "Copied";
  setTimeout(() => (button.textContent = label), 1500);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`folio: ${url} answered ${response.status}`);
  return response.text();
}

function setupCopy(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as Element;
    const page = target.closest<HTMLButtonElement>(".copy-page");
    if (page?.dataset.markdown) {
      void copy(page, fetchText(page.dataset.markdown));
      return;
    }
    const button = target.closest<HTMLButtonElement>("figure.code .copy");
    const code = button?.closest("figure")?.querySelector("pre")?.textContent;
    if (!button || code == null) return;
    void copy(button, code);
  });
}

function setupTheme(): void {
  const root = document.documentElement;
  // A prerendered page read the theme on hover; the reader may have switched it since.
  document.addEventListener("prerenderingchange", () => {
    try {
      const stored = localStorage.getItem(themeKey);
      if (stored === "light" || stored === "dark") root.dataset.theme = stored;
    } catch {
      // Storage is off; keep the theme the page started with.
    }
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    ".theme-toggle",
  )) {
    button.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try {
        localStorage.setItem(themeKey, next);
      } catch {
        // Storage is off in private modes; the choice lasts this page.
      }
    });
  }
}

function setupMenu(): void {
  const button = document.querySelector<HTMLButtonElement>(".menu-button");
  const sidebar = document.getElementById("sidebar");
  if (!button || !sidebar) return;
  const set = (open: boolean) => {
    button.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  };
  button.addEventListener("click", () =>
    set(button.getAttribute("aria-expanded") !== "true"),
  );
  sidebar.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a, .menu-close")) set(false);
  });
  document.querySelector(".scrim")?.addEventListener("click", () => set(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") set(false);
  });
}

/** Prefetches a same-site page on hover where speculation rules do not prerender it. */
function setupPrefetch(): void {
  if (HTMLScriptElement.supports?.("speculationrules")) return;
  const fetched = new Set([location.pathname]);
  document.addEventListener("pointerover", (event) => {
    const link = (event.target as Element).closest?.<HTMLAnchorElement>(
      "a[href]",
    );
    if (!link || link.origin !== location.origin) return;
    if (fetched.has(link.pathname)) return;
    fetched.add(link.pathname);
    const hint = document.createElement("link");
    hint.rel = "prefetch";
    hint.href = link.pathname;
    document.head.append(hint);
  });
}

/** Marks the TOC link of the last heading that has scrolled past the top band. */
function setupScrollSpy(): void {
  const links = new Map<string, HTMLAnchorElement>();
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    ".toc a[href^='#']",
  )) {
    links.set(decodeURIComponent(link.hash.slice(1)), link);
  }
  const headings = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
  if (headings.length === 0) return;
  const update = () => {
    const line = window.innerHeight * 0.25;
    let current = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= line) current = heading;
    }
    for (const [id, link] of links) {
      if (id === current?.id) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  };
  let frame = 0;
  window.addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

async function mount(el: HTMLElement, islands: Islands): Promise<void> {
  const name = el.dataset.island ?? "";
  const load = islands[name];
  if (!load) {
    console.error(`folio: no island named "${name}"`);
    return;
  }
  const { default: island } = await load();
  el.replaceChildren();
  render(() => createComponent(island, {}), el);
  el.dataset.mounted = "";
}

/** Mounts each island as it nears the viewport. */
function setupIslands(islands: Islands): void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        void mount(entry.target as HTMLElement, islands);
      }
    },
    { rootMargin: "400px 0px" },
  );
  for (const el of document.querySelectorAll<HTMLElement>("[data-island]")) {
    observer.observe(el);
  }
}

export function start(islands: Islands): void {
  setupCopy();
  setupTheme();
  setupMenu();
  setupPrefetch();
  setupScrollSpy();
  setupIslands(islands);
}
