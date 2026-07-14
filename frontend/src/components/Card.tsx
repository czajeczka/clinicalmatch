import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

/** Rounded surface card with soft elevation (see design tokens). */
export function Card({
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'border-border bg-surface rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)]',
        interactive &&
          'cursor-pointer transition-shadow hover:shadow-[var(--shadow-pop)]',
        className
      )}
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
