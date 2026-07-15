import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface StatTileProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  onClick?: () => void
}

/** Compact metric tile for the dashboard. Renders as a button when clickable
 *  (keyboard-accessible, focus ring); otherwise a plain surface. */
export function StatTile({ label, value, icon, onClick }: StatTileProps) {
  const base =
    'border-border bg-surface rounded-[var(--radius-card)] border p-4 text-left shadow-[var(--shadow-card)]'
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="font-display text-text text-2xl leading-none font-semibold">
          {value}
        </span>
        {icon && <span className="text-primary/70">{icon}</span>}
      </div>
      <p className="text-text-muted mt-1.5 text-xs font-medium">{label}</p>
    </>
  )
  if (!onClick) return <div className={base}>{body}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        base,
        'transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]'
      )}
    >
      {body}
    </button>
  )
}
