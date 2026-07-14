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

/** Two-or-more option switch (AI Assistant tools, Profile subviews). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="border-border bg-surface-muted inline-flex w-full gap-1 rounded-[var(--radius-control)] border p-1"
    >
      {segments.map((seg) => {
        const active = seg.value === value
        return (
          <button
            key={seg.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(seg.value)}
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
