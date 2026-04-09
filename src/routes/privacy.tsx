import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({ component: PrivacyPage })

function PrivacyPage() {
  return (
    <div className="fixed inset-0 z-10 overflow-y-auto bg-[var(--parchment)]">
      <div className="mx-auto max-w-2xl px-6 pb-16 pt-20">
        <h1 className="display-title mb-6 text-3xl font-bold text-[var(--ink)]">Data Privacy</h1>
        <div className="space-y-4 text-sm leading-relaxed text-[var(--ink)]">
          <p>This site embeds YouTube videos via youtube-nocookie.com. YouTube's privacy policy applies when you play a video.</p>
          <p>No personal data is collected, stored, or processed by this site. No cookies are set by this site.</p>
          <p>The site is hosted as a static page. No analytics or tracking is used.</p>
        </div>
      </div>
    </div>
  )
}
