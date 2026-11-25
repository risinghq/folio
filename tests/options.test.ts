import { describe, expect, it } from "vitest";

import { repositoryUrl, resolveOptions } from "../src/options.ts";

describe("repositoryUrl", () => {
  it.each([
    ["o/r", "https://github.com/o/r"],
    ["github:o/r", "https://github.com/o/r"],
    ["git+https://github.com/o/r.git", "https://github.com/o/r"],
    ["git://github.com/o/r.git", "https://github.com/o/r"],
    ["git@github.com:o/r.git", "https://github.com/o/r"],
    ["ssh://git@github.com/o/r.git", "https://github.com/o/r"],
  ])("reads %s", (field, url) => {
    expect(repositoryUrl(field)).toBe(url);
    expect(repositoryUrl({ url: field })).toBe(url);
  });
});

describe("resolveOptions", () => {
  const pkg = {
    name: "@scope/thing",
    version: "1.2.3",
    description: "A thing.",
    repository: { url: "git+https://github.com/o/thing.git" },
  };

  it("fills title, version, description and repository from package.json", () => {
    expect(resolveOptions({}, pkg)).toMatchObject({
      title: "thing",
      version: "1.2.3",
      description: "A thing.",
      repository: "https://github.com/o/thing",
      docs: "docs",
    });
  });

  it("prefers a given option and ignores an undefined one", () => {
    const options = resolveOptions({ title: "Thing", version: undefined }, pkg);
    expect(options.title).toBe("Thing");
    expect(options.version).toBe("1.2.3");
  });

  it("works with no package.json", () => {
    expect(resolveOptions({})).toMatchObject({
      title: "Docs",
      description: "",
    });
  });
});

describe("the site's address", () => {
  it("comes from homepage", () => {
    const options = resolveOptions({}, { homepage: "https://thing.dev" });
    expect(options.url).toBe("https://thing.dev");
  });

  it.each([
    ["the README npm init points at", "https://github.com/o/thing#readme"],
    ["an unparsable value", "thing.dev"],
    ["an empty value", ""],
  ])("is unknown from %s", (_, homepage) => {
    expect(resolveOptions({}, { homepage }).url).toBeUndefined();
  });

  it("prefers the url option", () => {
    const options = resolveOptions(
      { url: "https://docs.thing.dev" },
      { homepage: "https://thing.dev" },
    );
    expect(options.url).toBe("https://docs.thing.dev");
  });
});
