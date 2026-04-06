export function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 hidden rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 shadow-md backdrop-blur-lg md:block">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[rgba(79,140,100,0.35)]" />
          <span className="text-[var(--sea-ink-soft)]">Released</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[rgba(150,150,140,0.25)]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(90,74,58,0.1) 2px, rgba(90,74,58,0.1) 3px)' }} />
          <span className="text-[var(--sea-ink-soft)]">Coming Soon</span>
        </div>
      </div>
    </div>
  )
}
