import { formatReleaseDate, daysUntil } from '#/lib/formatDate'

interface CountdownBadgeProps {
  status: 'released' | 'upcoming'
  releaseDate: string | null
}

export function CountdownBadge({ status, releaseDate }: CountdownBadgeProps) {
  if (!releaseDate) return null

  if (status === 'released') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(79,140,100,0.15)] px-3 py-1 text-xs font-semibold text-[var(--palm)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--palm)]" />
        Released {formatReleaseDate(releaseDate)}
      </span>
    )
  }

  const days = daysUntil(releaseDate)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(150,150,140,0.15)] px-3 py-1 text-xs font-semibold text-[var(--sea-ink-soft)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--sea-ink-soft)]" />
      Coming {formatReleaseDate(releaseDate)}
      {days > 0 && ` — ${days} day${days === 1 ? '' : 's'} to go`}
    </span>
  )
}
