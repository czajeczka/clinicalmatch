import type { ReactNode } from 'react'
import { useDialog } from '@/hooks/useDialog'
import { IconButton } from './IconButton'
import { CloseIcon } from './icons'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Mobile bottom sheet that becomes a centered modal on ≥768px
 * (see assignment § Responsiveness). Used for creation flows.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const ref = useDialog(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="bg-surface relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-[20px] shadow-[var(--shadow-sheet)] md:rounded-[20px] md:shadow-[var(--shadow-pop)]"
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-black/15 md:hidden" />
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="font-display text-text text-lg font-semibold">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <CloseIcon className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-4 pb-6">{children}</div>
      </div>
    </div>
  )
}
