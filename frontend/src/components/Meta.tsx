import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Icon + text metadata item, used across trial cards and the detail page for
 *  consistent, scannable metadata (location, sponsor, source id, …). */
export function MetaItem({
  icon,
  children,
  className,
}: {
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'text-text-muted inline-flex min-w-0 items-center gap-1.5 text-xs',
        className
      )}
    >
      {icon && (
        <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      )}
      <span className="truncate">{children}</span>
    </span>
  )
}
