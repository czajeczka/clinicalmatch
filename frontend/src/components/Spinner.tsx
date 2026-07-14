import { cn } from '@/lib/cn'

/** Inline, control-scoped spinner. Pair with an honest label near it. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  )
}

/** Spinner + honest label, e.g. "Reading the study…". */
export function SpinnerLabel({ label }: { label: string }) {
  return (
    <span className="text-text-muted inline-flex items-center gap-2 text-sm">
      <Spinner className="h-4 w-4" />
      {label}
    </span>
  )
}
