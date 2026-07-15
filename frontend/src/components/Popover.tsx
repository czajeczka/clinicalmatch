import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PopoverProps {
  /** Accessible label for the (usually icon-only) trigger. */
  label: string
  /** Visual content of the trigger button. */
  trigger: ReactNode
  /** Panel content. Receives a `close()` helper for menu items. */
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  triggerClassName?: string
  panelClassName?: string
}

/**
 * Lightweight, accessible dropdown anchored to its trigger. Closes on Escape
 * (restoring focus to the trigger) and on a click outside. The panel is a
 * labelled dialog; callers render their own list/menu inside. Used by the
 * dashboard top bar (notifications, profile).
 */
export function Popover({
  label,
  trigger,
  children,
  align = 'right',
  triggerClassName,
  panelClassName,
}: PopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full transition-colors',
          'hover:bg-text/5 active:bg-text/10',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
          triggerClassName
        )}
      >
        {trigger}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            'animate-fade-in border-border bg-surface absolute top-full z-40 mt-2 overflow-hidden rounded-[var(--radius-card)] border shadow-[var(--shadow-pop)]',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  )
}
