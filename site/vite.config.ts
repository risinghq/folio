import { defineConfig } from "vite";

import pkg from "../package.json" with { type: "json" };
import { folio } from "../src/index.ts";

export default defineConfig({
  plugins: [
    folio({
      title: "folio",
      version: pkg.version,
      description: pkg.description,
      docs: "../docs",
      repository: "https://github.com/risinghq/folio",
      islands: "src/islands.ts",
      landing: "landing",
    }),
  ],
});
