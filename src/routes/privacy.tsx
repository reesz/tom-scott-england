import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({ component: PrivacyPage })

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm text-[var(--lagoon-deep)]">
        &larr; Back to map
      </Link>
      <h1 className="display-title mb-6 text-3xl font-bold text-[var(--sea-ink)]">Data Privacy</h1>
      <div className="prose text-[var(--sea-ink-soft)]">
        <p>This site embeds YouTube videos via youtube-nocookie.com. YouTube's privacy policy applies when you play a video.</p>
        <p>No personal data is collected, stored, or processed by this site. No cookies are set by this site.</p>
        <p>The site is hosted as a static page. No analytics or tracking is used.</p>
      </div>
    </div>
  )
}
