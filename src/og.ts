import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const require = createRequire(import.meta.url);

/** What one page's social card shows. */
export interface Card {
  /** The brand above the title. The home card leaves it out: its title is the site. */
  site?: string;
  title: string;
  summary: string;
  /** The site's address without its scheme, in the card's footer. */
  host?: string;
}

interface Node {
  type: string;
  props: { style?: Record<string, string | number>; children?: unknown };
}

const div = (style: Record<string, string | number>, children?: unknown) => ({
  type: "div",
  props: { style, children },
});

type Palette = Record<
  "bg" | "line" | "text" | "muted" | "faint" | "accent",
  string
>;

/** The dark theme's colours: the first `:root` block of theme/tokens.css. */
export function darkPalette(tokens: string): Palette {
  const block = /:root\s*\{([^}]*)\}/.exec(tokens)?.[1] ?? "";
  const values = Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]),
  );
  const names = ["bg", "line", "text", "muted", "faint", "accent"] as const;
  for (const name of names)
    if (!values[name]) throw new Error(`folio: tokens.css has no --${name}`);
  return values as Palette;
}

/** Cuts text to `max` characters at a word boundary. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max).replace(/\s+\S*$/, "");
  return `${cut}…`;
}

export const cardSize = { width: 1200, height: 630 };
const inset = { x: 80, y: 72 };

function layout(card: Card, color: Palette): Node {
  const brand = div({ display: "flex", alignItems: "center", gap: 20 }, [
    div({
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: color.accent,
    }),
    card.site
      ? div({ fontSize: 34, fontWeight: 600, color: color.text }, card.site)
      : null,
  ]);
  const body = div(
    { display: "flex", flexDirection: "column", gap: 28, width: "100%" },
    [
      div(
        {
          fontSize: card.title.length > 32 ? 68 : 84,
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: color.text,
        },
        clip(card.title, 60),
      ),
      card.summary
        ? div(
            { fontSize: 32, lineHeight: 1.4, color: color.muted },
            clip(card.summary, 140),
          )
        : null,
    ],
  );
  const foot = div(
    {
      display: "flex",
      paddingTop: 28,
      borderTop: `2px solid ${color.line}`,
      fontSize: 26,
      color: color.faint,
    },
    card.host ?? "",
  );
  const frame = div(
    {
      width: cardSize.width - 2 * inset.x,
      height: cardSize.height - 2 * inset.y,
      margin: `${inset.y}px ${inset.x}px`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    },
    [brand, body, foot],
  );
  return div(
    {
      ...cardSize,
      display: "flex",
      backgroundColor: color.bg,
      fontFamily: "Figtree",
    },
    [frame],
  );
}

type Weight = 400 | 600 | 700;
let fonts:
  | Promise<{ name: string; data: Buffer; weight: Weight }[]>
  | undefined;
let palette: Promise<Palette> | undefined;

function loadPalette() {
  const tokens = new URL("../theme/tokens.css", import.meta.url);
  palette ??= readFile(tokens, "utf8").then(darkPalette);
  return palette;
}

function loadFonts() {
  const face = (weight: Weight) =>
    readFile(
      require.resolve(
        `@fontsource/figtree/files/figtree-latin-${weight}-normal.woff`,
      ),
    ).then((data) => ({ name: "Figtree", data, weight }));
  fonts ??= Promise.all([face(400), face(600), face(700)]);
  return fonts;
}

/** A page's social card as a PNG, 1200 by 630. */
export async function renderCard(card: Card): Promise<Uint8Array> {
  const svg = await satori(layout(card, await loadPalette()) as never, {
    ...cardSize,
    fonts: await loadFonts(),
  });
  return new Resvg(svg).render().asPng();
}
