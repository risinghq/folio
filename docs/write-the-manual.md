# Write the manual

A manual is a folder of markdown files and an index, `README.md`, that orders
them.

## The index

The first list in `docs/README.md` names the pages. Each item links to a file in
the folder, and the link text is the page's title in the sidebar:

```md
- [Getting started](getting-started.md)
- [`createThing`](create-thing.md)
```

A file name must be lowercase letters, digits and dashes; the name is the page's
route, `docs/<name>`. Backticks in the link text are dropped from the sidebar
title. The build fails when an item does not link to such a file. A page the
index does not list is not part of the site.

## A page

The page's first `#` heading is its title. The first paragraph after it becomes
the page's meta description. The sidebar numbers the pages in index order.

Every `##` and `###` heading gets an anchor and an entry in the page's table of
contents. On a wide screen the contents sit in a right rail; on a narrow one
they fold into the top of the page.

## Links

A link to another page, `[Islands](islands.md)`, becomes that page's route and
keeps its `#hash`. A link to any other `.md` file opens its source on GitHub
when the `repository` option is set. Other links stay as written; a link to an
`http` or `https` address gets `rel="noreferrer"`.

## Code blocks

Shiki highlights a fenced block whose language is `ts`, `tsx`, `js`,
`typescript`, `css`, `json`, `sh`, `bash` or `shellscript`. Any other language
renders as plain text. Each block shows its language and a Copy button.

```ts
export const answer = 42;
```

## Tables

A markdown table scrolls sideways on a narrow screen instead of overflowing the
page.

| Column | Meaning            |
| ------ | ------------------ |
| `a`    | The first column.  |
| `b`    | The second column. |
