import { useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { cn } from '@/lib/cn'
import {
  REPORT_REASONS,
  reportContent,
  type ReportTarget,
} from '@/lib/community'
import { useApp } from '@/store/store'

interface ReportDialogProps {
  open: boolean
  target: { type: ReportTarget; id: string } | null
  onClose: () => void
}

/**
 * Report a post or comment. Moderation is a device-local record for now
 * (TODO: real moderation queue in a backend seminar); the flow, reasons and
 * confirmation are production-shaped so it can be wired up later.
 */
export function ReportDialog({ open, target, onClose }: ReportDialogProps) {
  const { toast } = useApp()
  const [reason, setReason] = useState('')

  function submit() {
    if (!reason || !target) return
    reportContent(target.type, target.id, reason)
    toast('Thanks — this has been reported to the moderators.', 'success')
    setReason('')
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setReason('')
        onClose()
      }}
      title={`Report this ${target?.type ?? 'content'}`}
    >
      <div className="space-y-4">
        <p className="text-text-muted text-sm">
          Help keep this community safe. Tell us what’s wrong and a moderator
          will review it. Your report is confidential.
        </p>
        <fieldset className="space-y-2">
          <legend className="sr-only">Reason for reporting</legend>
          {REPORT_REASONS.map((r) => {
            const active = reason === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 text-left text-sm transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
                  active
                    ? 'border-primary bg-primary/5 text-text'
                    : 'border-border text-text hover:border-primary/40'
                )}
              >
                <span
                  className={cn(
                    'grid h-4 w-4 place-items-center rounded-full border',
                    active ? 'border-primary' : 'border-border'
                  )}
                  aria-hidden
                >
                  {active && (
                    <span className="bg-primary h-2 w-2 rounded-full" />
                  )}
                </span>
                {r}
              </button>
            )
          })}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!reason} onClick={submit}>
            Submit report
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
