/** A link in the site header. */
export interface NavLink {
  text: string;
  href: string;
}

export interface FolioOptions {
  /** The project name: the header brand and the suffix of every page title. */
  title: string;
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
  /** The island the home page mounts. With none, `/` opens the first page. */
  landing?: string;
  /** Extra header links, after "Manual". */
  nav?: NavLink[];
  /** A footer line, as HTML. */
  footer?: string;
}

type Optional = "landing" | "repository" | "islands" | "version";

export type ResolvedOptions = Required<Omit<FolioOptions, Optional>> &
  Pick<FolioOptions, Optional>;

export function resolveOptions(options: FolioOptions): ResolvedOptions {
  return {
    description: "",
    docs: "docs",
    branch: "master",
    docsPath: "docs",
    nav: [],
    footer: "",
    ...options,
  };
}
