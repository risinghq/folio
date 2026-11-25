#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { build, createServer, preview, type InlineConfig } from "vite";

import { folio, readPackage } from "./plugin.ts";

/** Where `folio build` writes the site; kept apart from a package's own `dist`. */
const outDir = ".folio";

const usage = `Usage: folio <command> [--base PATH] [--port N] [--host]

Commands:
  init      Add a docs folder and the docs:* scripts to package.json
  dev       Serve the site while editing
  build     Write the static site to ${outDir}/
  preview   Serve the built site

folio reads its options from the "folio" field of package.json. A project
with its own Vite config adds folio() to its plugins and runs vite instead.`;

function viteConfig(root: string, base?: string): InlineConfig {
  return {
    root,
    base,
    configFile: false,
    publicDir: false,
    plugins: [folio()],
    build: { outDir, emptyOutDir: true },
  };
}

function starterFiles(
  name: string,
  description: string,
): Record<string, string> {
  return {
    "docs/README.md": `# ${name} manual\n\n- [Getting started](getting-started.md)\n`,
    "docs/index.md": `# ${name}\n\n${description || `What ${name} does, in one line.`}\n\n[Get started](getting-started.md)\n`,
    "docs/getting-started.md": `# Getting started\n\nThe first page of the manual. \`docs/README.md\` lists the pages in order.\n`,
  };
}

const scripts = {
  "docs:dev": "folio dev",
  "docs:build": "folio build",
  "docs:preview": "folio preview",
};

/** Writes each starter file and script that does not exist yet, and says what it wrote. */
function init(root: string): void {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error("folio init: no package.json here. Run it in a package.");
  }
  const pkg = readPackage(root);
  const name = pkg.name?.replace(/^@[^/]+\//, "") ?? "Docs";
  for (const [file, content] of Object.entries(
    starterFiles(name, pkg.description ?? ""),
  )) {
    const path = join(root, file);
    if (existsSync(path)) continue;
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
    console.log(`created ${file}`);
  }

  const raw = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const missing = Object.entries(scripts).filter(
    ([key]) => !raw.scripts?.[key],
  );
  if (missing.length > 0) {
    raw.scripts = { ...raw.scripts, ...Object.fromEntries(missing) };
    writeFileSync(pkgPath, `${JSON.stringify(raw, null, 2)}\n`);
    console.log(
      `added ${missing.map(([key]) => key).join(", ")} to package.json`,
    );
  }

  const ignore = join(root, ".gitignore");
  if (existsSync(ignore)) {
    const lines = readFileSync(ignore, "utf8").split("\n");
    if (!lines.some((line) => line.trim().replace(/^\/|\/$/g, "") === outDir)) {
      writeFileSync(
        ignore,
        `${lines.join("\n").replace(/\n*$/, "\n")}${outDir}\n`,
      );
      console.log(`added ${outDir} to .gitignore`);
    }
  }
  console.log("\nRun the docs:dev script to see the site.");
}

async function main(argv: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      port: { type: "string" },
      base: { type: "string" },
      host: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command] = positionals;
  const root = process.cwd();
  const config = viteConfig(root, values.base);
  const server = {
    port: values.port === undefined ? undefined : Number(values.port),
    host: values.host,
  };

  if (values.help || command === undefined) {
    console.log(usage);
    return;
  }
  switch (command) {
    case "init":
      return init(root);
    case "dev": {
      const dev = await createServer({ ...config, server });
      await dev.listen();
      dev.printUrls();
      dev.bindCLIShortcuts({ print: true });
      return;
    }
    case "build":
      await build(config);
      console.log(`\nWrote the site to ${outDir}/`);
      return;
    case "preview": {
      const served = await preview({ ...config, preview: server });
      served.printUrls();
      served.bindCLIShortcuts({ print: true });
      return;
    }
    default:
      throw new Error(`folio: unknown command "${command}"\n\n${usage}`);
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
