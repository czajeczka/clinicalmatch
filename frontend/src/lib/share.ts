import type { ToastKind } from '@/store/store'

/**
 * Share a trial via the native Web Share sheet, falling back to copying the
 * link to the clipboard. Purely client-side — no backend/API involved.
 */
export async function shareTrial(
  trial: { id: string; title: string },
  toast: (message: string, kind?: ToastKind) => void
): Promise<void> {
  const url = `${window.location.origin}/trials/${encodeURIComponent(trial.id)}`
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: trial.title, url })
      return
    }
    await navigator.clipboard.writeText(url)
    toast('Link copied to clipboard', 'success')
  } catch {
    // User cancelled the share sheet, or clipboard is blocked — no-op.
  }
}
