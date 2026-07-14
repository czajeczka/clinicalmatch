import type { ReactNode } from 'react'
import { Card } from './Card'
import { SpinnerLabel } from './Spinner'
import { DisclaimerNote } from './DisclaimerNote'
import { Button } from './Button'
import { SparkIcon } from './icons'

interface AiResultPanelProps {
  title: string
  /** Honest, control-scoped loading label, e.g. "Reading the study…". */
  loadingLabel: string
  loading: boolean
  error: boolean
  /** null before the user has run the feature. */
  hasResult: boolean
  onRetry: () => void
  /** Shown when idle (before first run). */
  idle?: ReactNode
  children?: ReactNode
  /** Set false only for features that carry their own note (e.g. self-check). */
  showDisclaimer?: boolean
}

const FALLBACK =
  'The assistant couldn’t complete this right now. Please try again in a moment.'

/**
 * Standard wrapper for the AI comprehension surfaces (summary, plain-language
 * criteria, grounded answer). Owns the loading label, the calm error fallback,
 * and the informational-only note — so every AI surface behaves the same.
 */
export function AiResultPanel({
  title,
  loadingLabel,
  loading,
  error,
  hasResult,
  onRetry,
  idle,
  children,
  showDisclaimer = true,
}: AiResultPanelProps) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <SparkIcon className="text-secondary h-5 w-5" />
        <h3 className="font-display text-text font-semibold">{title}</h3>
      </div>

      {loading && <SpinnerLabel label={loadingLabel} />}

      {!loading && error && (
        <div className="text-text text-sm">
          <p>{FALLBACK}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && !hasResult && idle}

      {!loading && !error && hasResult && (
        <div aria-live="polite">
          {children}
          {showDisclaimer && <DisclaimerNote className="mt-4" />}
        </div>
      )}
    </Card>
  )
}
