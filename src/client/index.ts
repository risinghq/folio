import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "../../theme/theme.css";
import { render } from "@solidjs/web";
import { createComponent, type Component } from "solid-js";

/** Maps an island name to a loader of the module whose default export it mounts. */
export type Islands = Record<string, () => Promise<{ default: Component }>>;

const themeKey = "folio-theme";

async function copy(button: HTMLButtonElement, code: string): Promise<void> {
  await navigator.clipboard.writeText(code);
  button.textContent = "Copied";
  setTimeout(() => (button.textContent = "Copy"), 1500);
}

function setupCopy(): void {
  document.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "figure.code > .copy",
    );
    const code = button?.parentElement?.querySelector("pre")?.textContent;
    if (!button || code == null) return;
    void copy(button, code);
  });
}

function setupTheme(): void {
  const root = document.documentElement;
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
    if ((event.target as Element).closest("a")) set(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") set(false);
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

/** Mounts eager islands now and the rest as they near the viewport. */
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
    if ("eager" in el.dataset) void mount(el, islands);
    else observer.observe(el);
  }
}

export function start(islands: Islands): void {
  setupCopy();
  setupTheme();
  setupMenu();
  setupScrollSpy();
  setupIslands(islands);
}
