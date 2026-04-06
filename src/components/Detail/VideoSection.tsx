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
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
        <p className="text-sm text-[var(--sea-ink-soft)]">Video coming soon</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setActiveTab('youtube')}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            activeTab === 'youtube'
              ? 'bg-[rgba(255,0,0,0.1)] text-red-700'
              : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]'
          }`}
        >
          YouTube
        </button>
        <button
          onClick={() => setActiveTab('nebula')}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            activeTab === 'nebula'
              ? 'bg-[rgba(79,184,178,0.15)] text-[var(--lagoon-deep)]'
              : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]'
          }`}
        >
          Nebula
        </button>
      </div>

      {activeTab === 'youtube' && youtubeId && (
        <div className="aspect-video overflow-hidden rounded-xl border border-[var(--line)]">
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
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
          <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">Watch on Nebula</p>
          <a
            href={nebulaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[rgba(79,184,178,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:bg-[rgba(79,184,178,0.25)]"
          >
            Open on Nebula
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 2h7v7M12 2L2 12" />
            </svg>
          </a>
        </div>
      )}
    </div>
  )
}
