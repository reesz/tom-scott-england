interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function MapControls({ onZoomIn, onZoomOut, onReset }: MapControlsProps) {
  const buttonClass =
    'flex h-11 w-11 items-center justify-center rounded-[10px] border-[1.5px] border-[var(--line)] bg-[var(--surface)] shadow-[0_2px_8px_var(--shadow-soft)] backdrop-blur transition hover:bg-[var(--parchment-dark)] active:scale-95'

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
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
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {/* Compass rose */}
          <circle cx="10" cy="10" r="7.5" stroke="var(--ink)" strokeWidth="1.2" />
          <circle cx="10" cy="10" r="5.5" stroke="var(--ink)" strokeWidth="0.5" strokeDasharray="1.5 2" />
          {/* Cardinal diamonds */}
          <path d="M10 2.5L11 10L10 17.5L9 10Z" fill="var(--gold)" fillOpacity="0.25" stroke="var(--ink)" strokeWidth="0.8" />
          <path d="M2.5 10L10 9L17.5 10L10 11Z" fill="var(--gold)" fillOpacity="0.25" stroke="var(--ink)" strokeWidth="0.8" />
          {/* Center dot */}
          <circle cx="10" cy="10" r="1.2" fill="var(--gold)" />
        </svg>
      </button>
    </div>
  )
}
