/** Renders a LaTeX string. Minimal inline version — no KaTeX dependency. */
export function Math({ tex, className }: { tex: string; className?: string }) {
  return <code className={className}>{tex}</code>;
}
