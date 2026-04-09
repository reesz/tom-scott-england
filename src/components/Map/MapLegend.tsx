export function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 hidden rounded-[10px] border-[1.5px] border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[0_2px_8px_var(--shadow-soft)] backdrop-blur-lg md:block">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[var(--green-released-bg)]" style={{ border: '1px solid var(--green-released)' }} />
          <span className="display-title text-[var(--ink-soft)]">Released</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-sm bg-[var(--parchment-dark)]"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, var(--ink-faint) 2px, var(--ink-faint) 3px)',
            }}
          />
          <span className="display-title text-[var(--ink-soft)]">Coming Soon</span>
        </div>
      </div>
    </div>
  )
}
