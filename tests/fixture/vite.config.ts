import { defineConfig } from "vite";

import { folio } from "../../src/index.ts";

export default defineConfig({
  base: "/site/",
  plugins: [folio({ title: "Fixture", islands: "src/islands.ts" })],
});
