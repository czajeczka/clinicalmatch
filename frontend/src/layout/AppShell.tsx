import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { OfflineBanner } from '@/components/OfflineBanner'
import { Toasts } from '@/components/Toasts'
import { useApp } from '@/store/store'

/**
 * App layout: offline banner, scrollable screen area, persistent nav, toasts.
 * Gates the app behind first-run onboarding (device identity).
 */
export function AppShell() {
  const { user } = useApp()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col lg:flex-row">
      <BottomNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        {/* pb-20 keeps content clear of the fixed mobile tab bar */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="mx-auto w-full max-w-3xl">
            <Outlet />
          </div>
        </main>
      </div>
      <Toasts />
    </div>
  )
}
