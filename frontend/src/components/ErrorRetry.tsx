import { Button } from './Button'

/** Calm inline error with a retry, used by data-driven list screens. */
export function ErrorRetry({
  message = 'Something didn’t load. Please try again.',
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) {
  return (
    <div className="border-border bg-surface rounded-[var(--radius-card)] border p-6 text-center">
      <p className="text-text text-sm">{message}</p>
      <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
