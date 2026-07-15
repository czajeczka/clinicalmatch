import { useRef } from 'react'
import { cn } from '@/lib/cn'

interface Segment<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

/**
 * Two-or-more option switch (AI Assistant tools, Profile theme). Modelled as a
 * radiogroup — the options are mutually-exclusive settings, not tabs with
 * panels — with roving focus and arrow-key navigation for keyboard users.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function move(from: number, delta: number) {
    const next = (from + delta + segments.length) % segments.length
    onChange(segments[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="border-border bg-surface-muted inline-flex w-full gap-1 rounded-[var(--radius-control)] border p-1"
    >
      {segments.map((seg, i) => {
        const active = seg.value === value
        return (
          <button
            key={seg.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="radio"
            type="button"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(seg.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault()
                move(i, 1)
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault()
                move(i, -1)
              }
            }}
            className={cn(
              'flex-1 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
              active
                ? 'bg-surface text-primary shadow-[var(--shadow-card)]'
                : 'text-text-muted hover:text-text'
            )}
          >
            {seg.label}
          </button>
        )
      })}
    </div>
  )
}
