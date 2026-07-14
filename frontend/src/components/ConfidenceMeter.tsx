import type { Verdict } from '@/types'
import { cn } from '@/lib/cn'

const CONFIG: Record<
  Verdict,
  { label: string; color: string; fill: number; description: string }
> = {
  likely: {
    label: 'Likely',
    color: 'var(--color-verdict-likely)',
    fill: 100,
    description: 'You appear to meet the criteria we could check.',
  },
  possibly: {
    label: 'Possibly',
    color: 'var(--color-verdict-possibly)',
    fill: 60,
    description: 'Some details still need confirming.',
  },
  // Grey, never red — an informational estimate must not read as a verdict.
  unlikely: {
    label: 'Unlikely',
    color: 'var(--color-verdict-unlikely)',
    fill: 25,
    description: 'This study may not be a match based on what you shared.',
  },
}

/**
 * Three-stop confidence meter. The text label is the source of truth; colour
 * is a secondary cue (accessibility — see assignment § Accessibility).
 */
export function ConfidenceMeter({ verdict }: { verdict: Verdict }) {
  const c = CONFIG[verdict]
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span
          className="font-display text-xl font-semibold"
          style={{ color: c.color }}
        >
          {c.label}
        </span>
        <span className="text-text-muted font-mono text-xs uppercase">
          Estimate
        </span>
      </div>
      <div
        className="bg-text/8 h-2.5 w-full overflow-hidden rounded-full"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={c.fill}
        aria-valuetext={c.label}
        aria-label="Eligibility estimate"
      >
        <div
          className={cn('h-full rounded-full transition-all')}
          style={{ width: `${c.fill}%`, backgroundColor: c.color }}
        />
      </div>
      <p className="text-text-muted mt-2 text-sm">{c.description}</p>
    </div>
  )
}
