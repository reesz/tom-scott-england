import type { County } from '#/types/county'
import type { JourneyStop } from '#/types/journey'
import { formatReleaseDate } from '#/lib/formatDate'

interface JourneyStepperProps {
  stops: JourneyStop[]
  step: number
  county: County | undefined
  panelOpen: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onShowCounty: () => void
}

const navButtonClass =
  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--line)] transition hover:bg-[var(--parchment-dark)] active:scale-95 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent'

export function JourneyStepper({
  stops,
  step,
  county,
  panelOpen,
  onPrev,
  onNext,
  onClose,
  onShowCounty,
}: JourneyStepperProps) {
  const stop = stops.at(step)
  if (!stop) return null

  const releasedCount = stops.filter((s) => !s.upcoming).length
  const progress = Math.min(step + 1, releasedCount) / releasedCount
  const subtitle = stop.upcoming
    ? county?.releaseDate
      ? `Coming ${formatReleaseDate(county.releaseDate)}`
      : 'Coming soon'
    : stop.title
  const showsCountyName = county && county.name !== stop.historicCounty

  return (
    <div
      className={`pointer-events-none fixed inset-x-4 top-[76px] z-10 flex justify-center transition-[right] duration-300 md:top-auto md:bottom-4 md:left-4 ${
        panelOpen ? 'md:right-[446px] lg:right-[506px]' : 'md:right-[76px]'
      }`}
    >
      <div
        className="pointer-events-auto w-full max-w-[460px] overflow-hidden rounded-[12px] border-[1.5px] border-[var(--line)] bg-[var(--surface-strong)] shadow-[0_2px_12px_var(--shadow-soft)] backdrop-blur-lg"
        role="region"
        aria-label="Tom's journey"
      >
        <div className="flex items-center gap-2 px-2.5 py-2.5">
          <button onClick={onPrev} disabled={step === 0} className={navButtonClass} aria-label="Previous stop">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>

          <div className="min-w-0 flex-1 px-1" aria-live="polite">
            <p className="atlas-kicker truncate">
              {stop.upcoming ? (
                'Next stop'
              ) : (
                <>
                  <span className="md:hidden">Ep. {stop.episode}/{releasedCount}</span>
                  <span className="hidden md:inline">Episode {stop.episode} of {releasedCount}</span>
                </>
              )}
              {step > 0 && (stop.travel === 'train' ? ' · by train' : '')}
            </p>
            <p className="display-title truncate text-[15px] font-bold leading-tight text-[var(--ink)]">
              {stop.historicCounty}
              {showsCountyName && (
                <span className="font-normal text-[var(--ink-soft)]"> · {county.name}</span>
              )}
            </p>
            <p className="truncate text-[12px] italic text-[var(--ink-soft)]">
              {subtitle}
              {stop.place && !stop.upcoming && <span className="not-italic"> — {stop.place}</span>}
            </p>
          </div>

          <button
            onClick={onShowCounty}
            className="display-title flex-shrink-0 rounded-md border border-[var(--red-action-border)] bg-[var(--red-action-bg)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--red-action)] transition hover:brightness-95 md:hidden"
          >
            {stop.upcoming ? 'Details' : '▶ Watch'}
          </button>

          <button
            onClick={onNext}
            disabled={step >= stops.length - 1}
            className={navButtonClass}
            aria-label="Next stop"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center self-start rounded-md transition hover:bg-[var(--parchment-dark)]"
            aria-label="End journey"
          >
            <svg width="10" height="10" viewBox="0 0 18 18" fill="none" stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round">
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="14" y1="4" x2="4" y2="14" />
            </svg>
          </button>
        </div>

        {/* Progress along the route */}
        <div className="h-[3px] bg-[var(--parchment-dark)]">
          <div
            className="h-full bg-[var(--wax-red)] transition-[width] duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
