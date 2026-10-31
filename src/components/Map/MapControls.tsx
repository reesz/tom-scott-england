interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  journeyActive: boolean
  onToggleJourney: () => void
}

export function MapControls({ onZoomIn, onZoomOut, onReset, journeyActive, onToggleJourney }: MapControlsProps) {
  const buttonClass =
    'flex h-11 w-11 items-center justify-center rounded-[10px] border-[1.5px] border-[var(--line)] bg-[var(--surface)] shadow-[0_2px_8px_var(--shadow-soft)] backdrop-blur transition hover:bg-[var(--parchment-dark)] active:scale-95'

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
      <button
        onClick={onToggleJourney}
        className={`${buttonClass} mb-3 ${journeyActive ? '!border-[var(--wax-red)] !bg-[var(--red-action-bg)]' : ''}`}
        aria-label={journeyActive ? "Stop following Tom's journey" : "Follow Tom's journey"}
        aria-pressed={journeyActive}
        title="Follow Tom's journey"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          {/* Dotted route between two waypoints, ending at a pin */}
          <path d="M4.5 17.5C8 17.5 6 11 10.5 11S13 6 15.5 6" stroke="var(--wax-red)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.1 3" />
          <circle cx="4.5" cy="17.5" r="2" fill="var(--wax-red)" />
          <path d="M16 1.8a3.4 3.4 0 0 1 3.4 3.4c0 2.5-3.4 5.8-3.4 5.8s-3.4-3.3-3.4-5.8A3.4 3.4 0 0 1 16 1.8Z" fill="var(--gold)" fillOpacity="0.25" stroke="var(--ink)" strokeWidth="1.1" />
          <circle cx="16" cy="5.2" r="1.1" fill="var(--ink)" />
        </svg>
      </button>
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
