import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { readManual } from "../src/manual.ts";

describe("readManual", () => {
  it("lists the index's pages in order with plain titles", () => {
    const index = readFileSync(
      new URL("fixture/docs/README.md", import.meta.url),
      "utf8",
    );
    expect(readManual(index)).toEqual([
      { slug: "getting-started", title: "Getting started" },
      { slug: "create-thing", title: "createThing" },
    ]);
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
