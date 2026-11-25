import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { groupPages, readManual } from "../src/manual.ts";

describe("readManual", () => {
  it("lists the index's pages in order with plain titles", () => {
    const index = readFileSync(
      new URL("fixture/docs/README.md", import.meta.url),
      "utf8",
    );
    expect(readManual(index)).toEqual([
      { slug: "getting-started", title: "Getting started" },
      { slug: "create-thing", title: "createThing" },
      { slug: "guide/writing", title: "Writing pages", group: "Guide" },
    ]);
  });

  it("groups pages under the heading above their list", () => {
    const pages = readManual(
      "# M\n\n## Guide\n\n- [A](guide/a.md)\n- [B](./guide/b.md)\n\n## API\n\n- [C](api/c.md)",
    );
    expect(groupPages(pages)).toEqual([
      {
        group: "Guide",
        pages: [
          { slug: "guide/a", title: "A", group: "Guide" },
          { slug: "guide/b", title: "B", group: "Guide" },
        ],
      },
      { group: "API", pages: [{ slug: "api/c", title: "C", group: "API" }] },
    ]);
  });

  it("rejects a link out of the docs folder", () => {
    expect(() => readManual("- [Up](../up.md)")).toThrow(
      "does not link to a page",
    );
  });

  it("rejects an index with no list", () => {
    expect(() => readManual("# Empty\n\nNo pages.")).toThrow(
      "has no list of pages",
    );
  });

  it("rejects an item that does not link to a page", () => {
    expect(() => readManual("- [Site](https://example.com)")).toThrow(
      "does not link to a page",
    );
  });
});
