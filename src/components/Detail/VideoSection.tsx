import { useState } from 'react'

interface VideoSectionProps {
  youtubeId: string | null
  nebulaUrl: string | null
  status: 'released' | 'upcoming'
  releaseDate: string | null
}

export function VideoEmbed({ youtubeId, nebulaUrl, status }: VideoSectionProps) {
  if (status === 'upcoming') {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
        <p className="display-title text-sm text-[var(--ink-soft)]">Video coming soon</p>
      </div>
    )
  }

  return (
    <div className="aspect-video overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
      {youtubeId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      ) : nebulaUrl ? (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="var(--gold-line)" strokeWidth="1" />
            <circle cx="24" cy="24" r="18" stroke="var(--gold-line)" strokeWidth="0.5" strokeDasharray="3 4" />
            <path d="M24 10l3 8h8l-6.5 5 2.5 8L24 26l-7 5 2.5-8L13 18h8z" fill="var(--gold)" fillOpacity="0.2" stroke="var(--gold)" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <p className="display-title text-xs font-semibold text-[var(--ink-soft)]">
            Video available on Nebula
          </p>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="3" stroke="var(--ink-faint)" strokeWidth="1.2" />
            <path d="M10 9l5 3-5 3V9z" fill="var(--ink-faint)" />
          </svg>
          <p className="display-title text-xs text-[var(--ink-soft)]">Video coming soon</p>
        </div>
      )}
    </div>
  )
}

interface PlatformButtonsProps {
  youtubeId: string | null
  nebulaUrl: string | null
}

export function PlatformButtons({ youtubeId, nebulaUrl }: PlatformButtonsProps) {
  const [ytHover, setYtHover] = useState(false)

  return (
    <div className="-mt-3 sticky top-0 z-10 grid grid-cols-2 gap-2 bg-[var(--parchment-light)] py-2">
      <div className="relative">
        {youtubeId ? (
          <a
            href={`https://www.youtube.com/watch?v=${youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="display-title flex w-full items-center justify-center rounded-md border border-[var(--red-action-border)] bg-[var(--red-action-bg)] px-3 py-2.5 text-[12px] font-semibold text-[var(--red-action)] no-underline transition hover:brightness-95"
          >
            ▶ YouTube
          </a>
        ) : (
          <>
            <button
              onMouseEnter={() => setYtHover(true)}
              onMouseLeave={() => setYtHover(false)}
              className="display-title w-full cursor-default rounded-md border border-[var(--line)] px-3 py-2.5 text-[12px] font-semibold text-[var(--ink-faint)]"
            >
              ▶ YouTube
            </button>
            {ytHover && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[11px] text-[var(--ink-soft)] shadow-[0_2px_8px_var(--shadow-soft)]">
                Coming soon on YouTube
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--line)]" />
              </div>
            )}
          </>
        )}
      </div>
      {nebulaUrl ? (
        <a
          href={nebulaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="display-title flex w-full items-center justify-center rounded-md border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.1)] px-3 py-2.5 text-[12px] font-semibold text-[var(--nebula-teal)] no-underline transition hover:brightness-95"
        >
          ▶ Nebula
        </a>
      ) : (
        <button
          className="display-title cursor-default rounded-md border border-[var(--line)] px-3 py-2.5 text-[12px] font-semibold text-[var(--ink-faint)]"
          disabled
        >
          ▶ Nebula
        </button>
      )}
    </div>
  )
}
