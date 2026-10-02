import { useState } from "react";
import { ChevronDown, ChevronRight, Layers3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ScopeNode } from "./tree";

interface Props {
  nodes: ScopeNode[];
  selected: string | null;
  onSelect: (scope: string | null) => void;
}

export default function ScopeTree({ nodes, selected, onSelect }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(nodes.map((node) => node.path)),
  );
  const renderNodes = (items: ScopeNode[]) =>
    items.map((node) => {
      const open = expanded.has(node.path);
      return (
        <div role="none" key={node.path}>
          <div className="scope-tree-row">
            {node.children.length ? (
              <button
                className="scope-tree-toggle"
                aria-label={t(open ? "collapseScope" : "expandScope", { scope: node.path })}
                aria-expanded={open}
                onClick={() =>
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (next.has(node.path)) next.delete(node.path);
                    else next.add(node.path);
                    return next;
                  })
                }
              >
                {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            ) : (
              <span className="scope-tree-spacer" />
            )}
            <button
              className={`scope-tree-item${selected === node.path ? " selected" : ""}`}
              role="treeitem"
              aria-selected={selected === node.path}
              aria-expanded={node.children.length ? open : undefined}
              onClick={() => onSelect(node.path)}
            >
              <Layers3 size={15} />
              <span>{node.label}</span>
              <span className="scope-tree-count">{node.count}</span>
            </button>
          </div>
          {node.children.length > 0 && open && (
            <div className="scope-tree-children">{renderNodes(node.children)}</div>
          )}
        </div>
      );
    });

  return (
    <section className="scope-browser" aria-label={t("scopes")}>
      <h2>{t("scopeTreeHeading")}</h2>
      {nodes.length === 0 ? (
        <p className="field-empty">{t("noScopesAvailable")}</p>
      ) : (
        <div className="scope-tree" role="tree" aria-label={t("scopeTreeHeading")}>
          <button
            className={`scope-tree-item scope-all${selected === null ? " selected" : ""}`}
            role="treeitem"
            aria-selected={selected === null}
            onClick={() => onSelect(null)}
          >
            <Layers3 size={15} />
            <span>{t("allScopes")}</span>
          </button>
          {renderNodes(nodes)}
        </div>
      )}
    </section>
  );
}
