/** A link in the site header. */
export interface NavLink {
  text: string;
  href: string;
}

export interface FolioOptions {
  /** The project name: the header brand and the suffix of every page title. */
  title?: string;
  /** The version shown beside the brand. */
  version?: string;
  /** The home page's meta description. */
  description?: string;
  /** The manual's folder, relative to the Vite root. It holds `README.md`. */
  docs?: string;
  /** The repository's web address. Adds the GitHub link and "Edit this page". */
  repository?: string;
  /** The branch "Edit this page" opens. */
  branch?: string;
  /** The docs folder's path inside the repository. */
  docsPath?: string;
  /**
   * A module, relative to the Vite root, whose default export maps an island
   * name to a loader: `{ "hover-tap": () => import("./demos/hover-tap") }`.
   */
  islands?: string;
  /** Extra header links, after "Manual". */
  nav?: NavLink[];
  /** A footer line, as HTML. */
  footer?: string;
}

/** The fields of the nearest `package.json` that supply defaults. */
export interface PackageInfo {
  name?: string;
  version?: string;
  description?: string;
  repository?: string | { url?: string };
  /** folio's options, for a site that has no Vite config of its own. */
  folio?: FolioOptions;
}

type Optional = "repository" | "islands" | "version";

export type ResolvedOptions = Required<Omit<FolioOptions, Optional>> &
  Pick<FolioOptions, Optional>;

/** A `repository` field as a web address, from `o/r`, `github:o/r` or a git URL. */
export function repositoryUrl(
  field: PackageInfo["repository"],
): string | undefined {
  const raw = typeof field === "string" ? field : field?.url;
  if (!raw) return undefined;
  const shorthand = /^(?:github:)?([\w.-]+\/[\w.-]+)$/.exec(raw);
  if (shorthand) return `https://github.com/${shorthand[1]}`;
  return raw
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^ssh:\/\/git@/, "https://")
    .replace(/^git@([^:]+):/, "https://$1/")
    .replace(/\.git$/, "");
}

function defined(options: FolioOptions = {}): FolioOptions {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  );
}

/**
 * Fills each option the caller left out from `package.json`'s `folio` field,
 * then from its package fields, then from folio's defaults.
 */
export function resolveOptions(
  options: FolioOptions,
  pkg: PackageInfo = {},
): ResolvedOptions {
  return {
    title: pkg.name?.replace(/^@[^/]+\//, "") ?? "Docs",
    version: pkg.version,
    description: pkg.description ?? "",
    repository: repositoryUrl(pkg.repository),
    docs: "docs",
    branch: "master",
    docsPath: "docs",
    nav: [],
    footer: "",
    ...defined(pkg.folio),
    ...defined(options),
  };
}
