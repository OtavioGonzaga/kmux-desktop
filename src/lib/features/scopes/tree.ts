import type { IdentityDto } from "../../types/catalog";

export interface ScopeNode {
  path: string;
  label: string;
  count: number;
  children: ScopeNode[];
}

interface MutableNode {
  path: string;
  label: string;
  aliases: Set<string>;
  children: Map<string, MutableNode>;
}

export function buildScopeTree(identities: IdentityDto[]): ScopeNode[] {
  const roots = new Map<string, MutableNode>();
  for (const identity of identities) {
    for (const scope of new Set(identity.scopes)) {
      let siblings = roots;
      let path = "";
      for (const label of scope.split("/")) {
        path = path ? `${path}/${label}` : label;
        let node = siblings.get(label);
        if (!node) {
          node = { path, label, aliases: new Set(), children: new Map() };
          siblings.set(label, node);
        }
        node.aliases.add(identity.alias);
        siblings = node.children;
      }
    }
  }
  const convert = (nodes: Map<string, MutableNode>): ScopeNode[] =>
    [...nodes.values()]
      .map(({ path, label, aliases, children }) => ({
        path,
        label,
        count: aliases.size,
        children: convert(children),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  return convert(roots);
}

export function identityMatchesScope(identity: IdentityDto, scope: string): boolean {
  return identity.scopes.some((item) => item === scope || item.startsWith(`${scope}/`));
}
