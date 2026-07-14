import { useApp } from '@/store/store'
import { cn } from '@/lib/cn'
import { CheckIcon, InfoIcon, CloseIcon } from './icons'
import type { ToastKind } from '@/store/store'

const KIND_STYLES: Record<ToastKind, string> = {
  success: 'border-success/40',
  info: 'border-border',
  error: 'border-danger/50',
}

function KindIcon({ kind }: { kind: ToastKind }) {
  if (kind === 'success') return <CheckIcon className="text-success h-4 w-4" />
  if (kind === 'error') return <InfoIcon className="text-danger h-4 w-4" />
  return <InfoIcon className="text-secondary h-4 w-4" />
}

/** Bottom-anchored toast stack, sits above the tab bar. */
export function Toasts() {
  const { toasts, dismissToast } = useApp()
  if (toasts.length === 0) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'bg-surface text-text pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-[var(--radius-control)] border px-3.5 py-3 shadow-[var(--shadow-pop)]',
            KIND_STYLES[t.kind]
          )}
        >
          <KindIcon kind={t.kind} />
          <span className="flex-1 text-sm">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
            className="text-text-muted hover:text-text"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
