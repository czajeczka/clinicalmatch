import { InfoIcon } from './icons'
import { cn } from '@/lib/cn'

const DEFAULT =
  'Informational only — not medical advice. Final eligibility is always decided by the trial investigators.'

/**
 * The safety framing shown on every AI surface (see the brief's golden rule).
 * Calm and neutral — never alarmist.
 */
export function DisclaimerNote({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-text-muted flex items-start gap-1.5 text-xs leading-relaxed',
        className
      )}
    >
      <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children ?? DEFAULT}</span>
    </p>
  )
}
