import { defineConfig } from "vite";

import { folio } from "../src/index.ts";

export default defineConfig({
  plugins: [folio({ docs: "../docs", islands: "src/islands.ts" })],
});
