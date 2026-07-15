import { cn } from '@/lib/cn'

interface ChipProps {
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}

/** Toggle chip for disease filters and interest multi-select. */
export function Chip({ selected, disabled, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-surface text-text hover:border-primary/50'
      )}
    >
      {children}
    </button>
  )
}
