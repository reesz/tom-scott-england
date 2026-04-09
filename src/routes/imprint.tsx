import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/imprint')({ component: ImprintPage })

function ImprintPage() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-[var(--parchment)]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm text-[var(--gold)]">
          &larr; Back to map
        </Link>
        <h1 className="display-title mb-6 text-3xl font-bold text-[var(--ink)]">Imprint</h1>
        <div className="space-y-4 text-sm leading-relaxed text-[var(--ink)]">
          <p>This is a community fan project tracking Tom Scott's "Every County" video series.</p>
          <p>This site is not affiliated with Tom Scott or his production team.</p>
        </div>
      </div>
    </div>
  )
}
