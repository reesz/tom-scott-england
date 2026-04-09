import { useRef, useCallback, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  const bind = useDrag(
    ({ movement: [, my], memo }) => {
      const sheet = sheetRef.current
      if (!sheet) return memo

      // On first drag frame, capture the starting Y
      const startY = memo ?? sheet.getBoundingClientRect().top
      const newY = Math.max(40, startY + my)
      sheet.style.transition = 'none'
      sheet.style.transform = `translateY(${newY}px)`

      return startY
    },
    {
      filterTaps: true,
      axis: 'y',
    }
  )

  // Snap to closed or open positions when drag ends
  const handleDragEnd = useCallback(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    const currentY = sheet.getBoundingClientRect().top
    const vh = window.innerHeight

    sheet.style.transition = 'transform 0.3s ease-out'
    if (currentY > vh * 0.7) {
      // Close
      sheet.style.transform = `translateY(100%)`
      setTimeout(onClose, 300)
    } else if (currentY > vh * 0.4) {
      // Snap to peek (60% from top)
      sheet.style.transform = `translateY(${vh * 0.6}px)`
    } else {
      // Snap to full
      sheet.style.transform = `translateY(40px)`
    }
  }, [onClose])

  const snapY = isOpen ? `${window.innerHeight * 0.6}px` : '100%'

  return (
    <div
      ref={sheetRef}
      {...bind()}
      onPointerUp={handleDragEnd}
      className={`fixed left-0 right-0 z-20 h-[calc(100dvh-40px)] touch-none rounded-t-2xl border-t border-[var(--line)] bg-[var(--parchment-light)] shadow-2xl backdrop-blur-lg md:hidden`}
      style={{
        transform: `translateY(${snapY})`,
        transition: 'transform 0.3s ease-out',
        top: 0,
      }}
    >
      <div className="flex justify-center py-3">
        <div className="h-1 w-10 rounded-full bg-[var(--gold-line)]" />
      </div>
      {/* Gold rule */}
      <div className="mx-4 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />
      {/* Corner ornaments */}
      <svg className="pointer-events-none absolute left-2 top-2 opacity-45" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--gold)" strokeWidth="1.2">
        <path d="M2 2Q11 2 11 11Q2 11 2 2Z" /><path d="M4.5 4.5Q9 4.5 9 9Q4.5 9 4.5 4.5Z" />
      </svg>
      <svg className="pointer-events-none absolute right-2 top-2 -scale-x-100 opacity-45" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--gold)" strokeWidth="1.2">
        <path d="M2 2Q11 2 11 11Q2 11 2 2Z" /><path d="M4.5 4.5Q9 4.5 9 9Q4.5 9 4.5 4.5Z" />
      </svg>
      <div className="h-[calc(100%-2rem)] overflow-y-auto px-5 pb-8">
        {children}
      </div>
    </div>
  )
}
