import { useOnline } from '@/hooks/useOnline'
import { WifiOffIcon } from './icons'

/** Top banner shown when the PWA is offline (see assignment § States). */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      className="bg-text text-text-inverse flex items-center justify-center gap-2 px-4 py-2 text-sm"
    >
      <WifiOffIcon className="h-4 w-4" />
      You’re offline — showing saved data
    </div>
  )
}
