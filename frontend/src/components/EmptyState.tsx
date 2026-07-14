import type { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  body?: string
  actionLabel?: string
  onAction?: () => void
}

/** Friendly, directive empty state — never a blank screen. */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="text-primary/70 mb-3">{icon}</div>}
      <h3 className="font-display text-text text-lg font-semibold">{title}</h3>
      {body && <p className="text-text-muted mt-1 max-w-xs text-sm">{body}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
