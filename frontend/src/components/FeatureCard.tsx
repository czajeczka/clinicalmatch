import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ArrowRightIcon } from './icons'

type Tone = 'primary' | 'secondary' | 'accent'

const toneStyles: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/12 text-secondary',
  accent: 'bg-accent/12 text-accent',
}

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
  tone?: Tone
}

/**
 * Premium action card (Quick Actions). A large, keyboard-accessible surface
 * with a tinted icon tile, title, supporting copy and an arrow affordance that
 * animates on hover/focus. Depth + lift mirror the app's Card elevation tokens.
 */
export function FeatureCard({
  icon,
  title,
  description,
  onClick,
  tone = 'primary',
}: FeatureCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group border-border bg-surface flex h-full flex-col items-start gap-3 rounded-[var(--radius-card)] border p-4 text-left shadow-[var(--shadow-card)]',
        'transition-[transform,box-shadow,border-color] duration-200',
        'hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]'
      )}
    >
      <span
        className={cn(
          'grid h-11 w-11 place-items-center rounded-[12px] transition-transform duration-200 group-hover:scale-105',
          toneStyles[tone]
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-display text-text flex items-center gap-1 text-[15px] font-semibold">
          {title}
        </span>
        <span className="text-text-muted mt-1 block text-sm leading-relaxed">
          {description}
        </span>
      </span>
      <span className="text-primary inline-flex items-center gap-1 text-sm font-medium">
        <span className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          Open
        </span>
        <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}
