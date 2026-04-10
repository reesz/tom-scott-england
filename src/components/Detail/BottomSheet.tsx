import { useState, useEffect, type ReactNode } from 'react'
import { Drawer } from 'vaul'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const [snap, setSnap] = useState<number | string | null>(0.5)

  const isFull = snap === 1

  // Reset to half-open when sheet opens
  useEffect(() => {
    if (isOpen) setSnap(0.5)
  }, [isOpen])

  // Close sheet on canvas tap (not pan, not county selection)
  // Full state: any tap on canvas closes. Half state: only taps on empty canvas (no county hit).
  useEffect(() => {
    if (!isOpen) return
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    let startX = 0
    let startY = 0
    const threshold = 10

    const handleDown = (e: PointerEvent) => {
      startX = e.clientX
      startY = e.clientY
    }
    const handleUp = (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - startX)
      const dy = Math.abs(e.clientY - startY)
      if (dx > threshold || dy > threshold) return // was a pan, ignore

      if (isFull) {
        // Full state: any canvas tap closes
        onClose()
      }
      // Half state: close only if no county was selected (the useThreeScene
      // handler fires first and updates the URL — if a county was tapped the
      // sheet stays open with the new county, so we do nothing here)
    }

    canvas.addEventListener('pointerdown', handleDown)
    canvas.addEventListener('pointerup', handleUp)
    return () => {
      canvas.removeEventListener('pointerdown', handleDown)
      canvas.removeEventListener('pointerup', handleUp)
    }
  }, [isOpen, isFull, onClose])

  // Prevent vaul/radix from blocking pointer events on the body
  useEffect(() => {
    if (!isOpen) return
    const restore = () => { document.body.style.pointerEvents = '' }
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = ''
      }
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    restore()
    return () => { observer.disconnect(); restore() }
  }, [isOpen])

  // Signal full-screen state so the floating header can hide
  useEffect(() => {
    document.documentElement.toggleAttribute('data-sheet-full', isOpen && isFull)
    return () => { document.documentElement.removeAttribute('data-sheet-full') }
  }, [isOpen, isFull])

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      snapPoints={[0.5, 1]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      modal={false}
      handleOnly
      noBodyStyles
    >
      <Drawer.Portal>
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-20 h-[calc(100dvh-60px)] md:hidden"
        >
          {/* Close button — always 8px above the drawer's top edge */}
          <button
            onClick={onClose}
            className="absolute right-3 top-0 z-10 flex h-[42px] w-[42px] -translate-y-[calc(100%+8px)] items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--parchment-light)] shadow-lg hover:bg-[var(--parchment-dark)]"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="14" y1="4" x2="4" y2="14" />
            </svg>
          </button>

          {/* Inner container with overflow clipping and visual styling */}
          <div className="flex h-full flex-col overflow-hidden rounded-t-2xl border-t border-[var(--line)] bg-[var(--parchment-light)] shadow-2xl backdrop-blur-lg">
            {/* Handle */}
            <div className="relative">
              <Drawer.Handle
                className="!relative !flex !h-6 !w-full !items-center !justify-center !rounded-none !bg-transparent !my-2"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex h-10 items-center justify-center">
                <div className="h-1.5 w-12 rounded-full bg-[var(--gold-line)]" />
              </div>
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

            {/* Scrollable content — only scrollable at full snap */}
            <div
              className="min-h-0 flex-1 px-5 pb-8"
              style={{ overflowY: isFull ? 'auto' : 'hidden' }}
            >
              {children}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
