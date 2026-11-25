# Islands

An island is a Solid component mounted inside a static page. Place one with a
comment on its own line:

```md
<!-- island counter -->
```

This one is live:

<!-- island counter -->

## The islands module

The `islands` option names a module, relative to the Vite root; with the `folio`
commands that is the package's folder, so `"docs/islands.ts"` works. Its default
export maps each island name to a loader of the component's module:

```ts
// src/islands.ts
export default {
  counter: () => import("./counter.ts"),
};
```

An island name is lowercase letters, digits and dashes. Each loader is a dynamic
import, so Vite splits every island into its own chunk. A page loads only the
islands it places.

## When an island mounts

An island mounts when it comes within 400 px of the viewport. A name the islands
module does not export logs an error in the browser console and leaves the page
as it is.

## Controls

The theme styles these class names for islands to use: `btn`, `btn-primary`,
`btn-ghost` and `btn-sm` for buttons, `select` around a `<select>`, and `label`
for a small monospace caption. Range inputs and checkboxes take the accent
color. Theme tokens such as `--text`, `--line` and `--accent` are CSS custom
properties on the root, so an island's own styles follow the light and dark
themes.
