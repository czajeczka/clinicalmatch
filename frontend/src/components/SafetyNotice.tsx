import { ShieldIcon } from './icons'
import { cn } from '@/lib/cn'

/**
 * Peer-support safety notice, shown on community surfaces. Calm, never alarming
 * — consistent with the app's informational-only framing.
 */
export function SafetyNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'border-border bg-surface-muted text-text-muted flex items-start gap-2.5 rounded-[var(--radius-control)] border px-3.5 py-2.5 text-xs leading-relaxed',
        className
      )}
    >
      <ShieldIcon className="text-primary mt-0.5 h-4 w-4 shrink-0" />
      <span>
        This community is intended for peer support only and does not replace
        professional medical advice.
      </span>
    </div>
  )
}
