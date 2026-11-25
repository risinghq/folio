import pkg from "../../package.json" with { type: "json" };

import "./site.css";

const install = `bun add @risinghq/folio@https://github.com/risinghq/folio/releases/download/v${pkg.version}/risinghq-folio-${pkg.version}.tgz`;

export default function Landing() {
  const root = document.createElement("section");
  root.className = "landing";
  root.innerHTML = `
    <h1>A documentation site from your docs folder</h1>
    <p>folio is a Vite plugin. It renders each page of a repository's
    <code>docs/</code> folder as static HTML and mounts Solid islands where a
    page asks for a live demo.</p>
    <pre class="landing-install"><code></code></pre>
    <div class="landing-actions">
      <a class="btn btn-primary" href="docs/getting-started">Get started</a>
      <a class="btn btn-ghost" href="https://github.com/risinghq/folio" rel="noreferrer">GitHub</a>
    </div>`;
  root.querySelector(".landing-install code")!.textContent = install;
  return root;
}
