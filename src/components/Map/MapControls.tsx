interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function MapControls({ onZoomIn, onZoomOut, onReset }: MapControlsProps) {
  const buttonClass =
    'flex h-11 w-11 items-center justify-center rounded-[10px] border-[1.5px] border-[var(--line)] bg-[var(--surface)] shadow-[0_2px_8px_var(--shadow-soft)] backdrop-blur transition hover:bg-[var(--parchment-dark)] active:scale-95'

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 md:bottom-auto md:right-4 md:top-20">
      <button onClick={onZoomIn} className={buttonClass} aria-label="Zoom in">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--ink)" strokeWidth="2">
          <line x1="10" y1="4" x2="10" y2="16" />
          <line x1="4" y1="10" x2="16" y2="10" />
        </svg>
      </button>
      <button onClick={onZoomOut} className={buttonClass} aria-label="Zoom out">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--ink)" strokeWidth="2">
          <line x1="4" y1="10" x2="16" y2="10" />
        </svg>
      </button>
      <button onClick={onReset} className={buttonClass} aria-label="Reset view">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--ink)" strokeWidth="1.5">
          <circle cx="10" cy="10" r="7" />
          <line x1="10" y1="3" x2="10" y2="7" />
          <line x1="10" y1="5" x2="8" y2="3" />
          <line x1="10" y1="5" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  )
}
