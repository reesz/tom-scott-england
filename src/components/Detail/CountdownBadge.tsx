import { formatReleaseDate, daysUntil } from '#/lib/formatDate'

interface CountdownBadgeProps {
  status: 'released' | 'upcoming'
  releaseDate: string | null
}

export function CountdownBadge({ status, releaseDate }: CountdownBadgeProps) {
  if (!releaseDate) return null

  if (status === 'released') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-released-bg)] px-3 py-1 text-xs font-semibold text-[var(--green-released)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--green-released)]" />
        Released {formatReleaseDate(releaseDate)}
      </span>
    )
  }

  const days = daysUntil(releaseDate)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--parchment-dark)] px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-soft)]" />
      Coming {formatReleaseDate(releaseDate)}
      {days > 0 && ` — ${days} day${days === 1 ? '' : 's'} to go`}
    </span>
  )
}
