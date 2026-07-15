import type { HTMLAttributes, KeyboardEvent, MouseEvent } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

/**
 * Rounded surface card with soft elevation (see design tokens). When
 * `interactive` and given an `onClick`, the card becomes a real keyboard
 * target: focusable, activatable with Enter/Space, and exposed as a button to
 * assistive tech. The key handler only fires when the card itself is focused
 * (`e.target === e.currentTarget`), so nested controls (Save/Join buttons)
 * keep their own behaviour without double-triggering navigation.
 */
export function Card({
  interactive = false,
  className,
  children,
  onClick,
  onKeyDown,
  ...props
}: CardProps) {
  const clickable = interactive && !!onClick
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(e)
    if (!clickable || e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(e as unknown as MouseEvent<HTMLDivElement>)
    }
  }
  return (
    <div
      className={cn(
        'border-border bg-surface rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)]',
        interactive &&
          'cursor-pointer transition-shadow hover:shadow-[var(--shadow-pop)]',
        clickable &&
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
        className
      )}
      onClick={onClick}
      onKeyDown={clickable || onKeyDown ? handleKeyDown : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

/** Section heading used across screens. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-text mb-3 text-lg font-semibold">
      {children}
    </h2>
  )
}
