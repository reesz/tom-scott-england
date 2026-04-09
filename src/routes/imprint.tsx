import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/imprint')({ component: ImprintPage })

function ImprintPage() {
  return (
    <div className="fixed inset-0 z-10 overflow-y-auto bg-[var(--parchment)]">
      <div className="mx-auto max-w-2xl px-6 pb-16 pt-20">
        <h1 className="display-title mb-6 text-3xl font-bold text-[var(--ink)]">Imprint</h1>
        <div className="space-y-4 text-sm leading-relaxed text-[var(--ink)]">
          <p>This is a community fan project tracking Tom Scott's "Every County" video series.</p>
          <p>This site is not affiliated with Tom Scott or his production team.</p>
        </div>
      </div>
    </div>
  )
}
