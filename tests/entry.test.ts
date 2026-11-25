import { isAbsolute } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveOptions } from "../src/options.ts";
import { entryModule } from "../src/plugin.ts";

describe("the client entry", () => {
  it("does not import a package that is only folio's dependency", () => {
    const code = entryModule(
      "/site",
      resolveOptions({ title: "Fixture", islands: "src/islands.ts" }),
    );
    const specifiers = code
      .split("\n")
      .filter((line) => line.startsWith("import"))
      .map((line) => /"([^"]+)"/.exec(line)?.[1]);
    const offenders = specifiers.filter(
      (s) =>
        s === undefined || (!isAbsolute(s) && !s.startsWith("@risinghq/folio")),
    );
    expect(offenders).toEqual([]);
  });
});
