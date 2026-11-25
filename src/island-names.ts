/** The parts of an ESTree program the islands module's default export needs. */
interface Node {
  type: string;
  [key: string]: unknown;
}

function propertyName(property: Node): string | undefined {
  if (property.type !== "Property" || property.computed) return undefined;
  const key = property.key as Node;
  if (key.type === "Identifier") return key.name as string;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return undefined;
}

function objectKeys(object: Node): Set<string> | undefined {
  const names = new Set<string>();
  for (const property of object.properties as Node[]) {
    const name = propertyName(property);
    if (name === undefined) return undefined;
    names.add(name);
  }
  return names;
}

function topLevelObject(program: Node, name: string): Node | undefined {
  for (const statement of program.body as Node[]) {
    const declaration =
      statement.type === "ExportNamedDeclaration"
        ? (statement.declaration as Node | null)
        : statement;
    if (declaration?.type !== "VariableDeclaration") continue;
    for (const declarator of declaration.declarations as Node[]) {
      const id = declarator.id as Node;
      const init = declarator.init as Node | null;
      if (id.type === "Identifier" && id.name === name)
        return init?.type === "ObjectExpression" ? init : undefined;
    }
  }
  return undefined;
}

/**
 * The island names an islands module's default export holds: an object
 * literal, or a top-level constant bound to one. Undefined when the names are
 * only known at run time, such as from a spread or a computed key.
 */
export function exportedIslands(program: Node): Set<string> | undefined {
  for (const statement of program.body as Node[]) {
    if (statement.type !== "ExportDefaultDeclaration") continue;
    const declaration = statement.declaration as Node;
    if (declaration.type === "ObjectExpression") return objectKeys(declaration);
    if (declaration.type === "Identifier") {
      const object = topLevelObject(program, declaration.name as string);
      return object && objectKeys(object);
    }
    return undefined;
  }
  return undefined;
}

/** Each page that places an island the module lacks, with the names it lacks. */
export function missingIslands(
  placed: Map<string, string[]>,
  exported: Set<string>,
): { page: string; names: string[] }[] {
  return [...placed]
    .map(([page, names]) => ({
      page,
      names: [...new Set(names)].filter((name) => !exported.has(name)),
    }))
    .filter((entry) => entry.names.length > 0);
}
