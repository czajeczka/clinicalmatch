import { cn } from '@/lib/cn'
import type { TrialStatus } from '@/types'
import { colorForDisease } from '@/lib/diseases'
import { statusLabel } from '@/lib/format'

/** Recruitment status. Colour is paired with text, never colour-only. */
export function StatusBadge({ status }: { status: TrialStatus }) {
  const styles: Record<TrialStatus, string> = {
    recruiting: 'bg-success/12 text-success',
    'not yet recruiting': 'bg-warning/12 text-warning',
    closed: 'bg-text-muted/15 text-text-muted',
    completed: 'bg-text-muted/15 text-text-muted',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-medium',
        styles[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {statusLabel(status)}
    </span>
  )
}

/** Disease label with its consistent colour accent (any disease area). */
export function DiseasePill({ disease }: { disease: string }) {
  const color = colorForDisease(disease)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {disease}
    </span>
  )
}

/** Small mono tag for discussions. */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-secondary/12 text-secondary inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs">
      #{children}
    </span>
  )
}
