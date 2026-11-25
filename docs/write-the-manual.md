# Write the manual

A manual is a folder of markdown files and an index, `README.md`, that orders
them.

## The index

The lists in `docs/README.md` name the pages. Each item links to a file in the
folder, and the link text is the page's title in the sidebar. A `##` heading
starts a group: the sidebar and `llms.txt` show it above the pages listed under
it.

```md
- [Getting started](getting-started.md)
- [`createThing`](create-thing.md)

## Guide

- [Writing pages](guide/writing.md)
```

A file name, and each folder above it, is lowercase letters, digits and dashes.
The path without `.md` is the page's route: `guide/writing.md` is
`docs/guide/writing`. Backticks in the link text are dropped from the sidebar
title. The build fails when an item does not link to such a file. A page the
index does not list is not part of the site.

## A page

The page's first `#` heading is its title. The first paragraph after it becomes
the page's meta description. The sidebar numbers the pages in index order.

A page may open with YAML frontmatter. `title` stands in for a missing `#`
heading and `description` for the first paragraph. Other keys are ignored, and
none of it shows on the page.

```md
---
title: Writing pages
description: How a page links, warns and labels code.
---
```

Every `##` and `###` heading gets an anchor and an entry in the page's table of
contents. On a wide screen the contents sit in a right rail; on a narrow one
they fold into the top of the page.

## The home page

`docs/index.md` is the page at `/`. It has no sidebar. Its `#` heading is the
large title, and a paragraph that holds only links becomes a row of buttons, the
first one filled:

```md
# my-package

What my-package does, in one line.

[Get started](getting-started.md) [GitHub](https://github.com/o/my-package)
```

An [island](islands.md) on the last line of `index.md` stands beside the text on
a wide screen and under it on a narrow one: a place for the project's showcase
demo.

Without `index.md`, the home page shows the title and a link to the first page.
Leave `index.md` out of `README.md`'s list.

## Images

An image whose path is inside the docs folder is served with the site:

```md
![The settings panel](images/settings.png)
```

The path is relative to the page, stays inside the docs folder, and ends in
`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp` or `.avif`. The build copies
only the images a page shows, and fails when one is missing. Each `<img>`
carries the file's width and height, so the page does not move when it loads. An
image with an `http` or `https` address stays as written.

## Links

A link to another page, `[Islands](islands.md)`, becomes that page's route and
keeps its `#hash`. A relative link resolves from the page's folder, so
`guide/writing.md` reaches the first page with `../getting-started.md`. A link
that starts with `/` resolves from the docs folder and may leave out `.md`:
`/create-thing#options`. A link to any other `.md` file opens its source on
GitHub when the `repository` option is set. Other links stay as written; a link
to an `http` or `https` address gets `rel="noreferrer"`.

## Code blocks

Shiki highlights a fenced block whose language is `ts`, `tsx`, `js`,
`typescript`, `css`, `json`, `sh`, `bash` or `shellscript`. Any other language
renders as plain text. Each block shows its language and a Copy button. A label
in brackets after the language replaces it, to name a file:

````md
```ts [vite.config.ts]
export default {};
```
````

## Callouts

A GitHub alert becomes a callout titled with its kind: `NOTE`, `TIP`,
`IMPORTANT`, `WARNING` or `CAUTION`.

```md
> [!WARNING]
> This deletes the folder.
```

A container does the same with `::: note`, `info`, `tip`, `important`,
`warning`, `caution` or `danger`. Text after the kind replaces the title and may
hold inline markdown. `::: details` folds its body under the title, and
`::: code-group` stacks the code blocks inside it. A container with any other
kind stays as text.

```md
::: tip Keep it short
One idea per page.
:::
```

A quote without a marker stays a quote.

## Tables

A markdown table scrolls sideways on a narrow screen instead of overflowing the
page.

| Column | Meaning            |
| ------ | ------------------ |
| `a`    | The first column.  |
| `b`    | The second column. |
