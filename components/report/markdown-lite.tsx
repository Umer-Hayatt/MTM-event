import { Fragment, type ReactNode } from "react";
import { parseMarkdownLite, type Inline } from "@/lib/report/markdown-lite";

function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((n, i) => {
    switch (n.type) {
      case "text": return <Fragment key={i}>{n.value}</Fragment>;
      case "strong": return <strong key={i} className="font-semibold">{renderInline(n.children)}</strong>;
      case "em": return <em key={i}>{renderInline(n.children)}</em>;
      case "code": return <code key={i} className="rounded bg-surface px-1 py-0.5 font-mono text-[0.9em]">{n.value}</code>;
    }
  });
}

/** Renders markdown-lite to React elements. No dangerouslySetInnerHTML. */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={className}>
      {parseMarkdownLite(source).map((b, i) => {
        if (b.type === "paragraph") return <p key={i} className="mb-2 last:mb-0">{renderInline(b.children)}</p>;
        const Tag = b.ordered ? "ol" : "ul";
        return (
          <Tag key={i} className={`mb-2 space-y-1 pl-5 last:mb-0 ${b.ordered ? "list-decimal" : "list-disc"}`}>
            {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
          </Tag>
        );
      })}
    </div>
  );
}
