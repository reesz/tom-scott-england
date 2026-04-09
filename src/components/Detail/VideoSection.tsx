import { useState } from 'react'

interface VideoSectionProps {
  youtubeId: string | null
  nebulaUrl: string | null
  status: 'released' | 'upcoming'
  releaseDate: string | null
}

export function VideoSection({ youtubeId, nebulaUrl, status }: VideoSectionProps) {
  const [activeTab, setActiveTab] = useState<'youtube' | 'nebula'>('youtube')

  if (status === 'upcoming') {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
        <p className="display-title text-sm text-[var(--ink-soft)]">Video coming soon</p>
      </div>
    )
  }

  return (
    <div>
      {/* Video embed */}
      {activeTab === 'youtube' && youtubeId && (
        <div className="aspect-video overflow-hidden rounded-lg border border-[var(--line)]">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      {activeTab === 'nebula' && nebulaUrl && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
          <p className="mb-3 text-sm text-[var(--ink-soft)]">Watch on Nebula</p>
          <a
            href={nebulaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="display-title inline-flex items-center gap-2 rounded-full bg-[rgba(79,184,178,0.12)] px-5 py-2.5 text-sm font-semibold text-[var(--nebula-teal)] no-underline transition hover:bg-[rgba(79,184,178,0.2)]"
          >
            Open on Nebula
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 2h7v7M12 2L2 12" />
            </svg>
          </a>
        </div>
      )}

      {/* Platform buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveTab('youtube')}
          className={`display-title rounded-md px-3 py-2.5 text-[12px] font-semibold transition ${
            activeTab === 'youtube'
              ? 'border border-[var(--red-action-border)] bg-[var(--red-action-bg)] text-[var(--red-action)]'
              : 'border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--parchment-dark)]'
          }`}
        >
          ▶ YouTube
        </button>
        <button
          onClick={() => setActiveTab('nebula')}
          className={`display-title rounded-md px-3 py-2.5 text-[12px] font-semibold transition ${
            activeTab === 'nebula'
              ? 'border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.1)] text-[var(--nebula-teal)]'
              : 'border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--parchment-dark)]'
          }`}
        >
          ▶ Nebula
        </button>
      </div>
    </div>
  )
}
