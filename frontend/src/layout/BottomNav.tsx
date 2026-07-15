import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import {
  HomeIcon,
  SearchIcon,
  UsersIcon,
  SparkIcon,
  UserIcon,
  ShieldIcon,
} from '@/components/icons'
import { useApp } from '@/store/store'
import type { ComponentType, SVGProps } from 'react'

interface Tab {
  to: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  end?: boolean
}

const TABS: Tab[] = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/trials', label: 'Trials', Icon: SearchIcon },
  { to: '/support', label: 'Support', Icon: UsersIcon },
  { to: '/assistant', label: 'AI Assistant', Icon: SparkIcon },
  { to: '/profile', label: 'Profile', Icon: UserIcon },
]

const ADMIN_TAB: Tab = { to: '/admin', label: 'Admin', Icon: ShieldIcon }

/**
 * Primary five-tab navigation. A bottom bar on mobile; becomes a left rail on
 * large screens (see assignment § Responsiveness) while keeping the same five
 * destinations.
 */
export function BottomNav() {
  const { isAdmin } = useApp()
  const tabs = isAdmin ? [...TABS, ADMIN_TAB] : TABS
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'border-border bg-surface/95 z-30 border-t backdrop-blur-md',
        // mobile: fixed bottom bar
        'fixed inset-x-0 bottom-0 flex',
        // desktop: static left rail
        'lg:static lg:h-full lg:w-60 lg:flex-col lg:border-t-0 lg:border-r lg:pt-4'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus)]',
              'lg:flex-none lg:flex-row lg:gap-3 lg:px-6 lg:py-3 lg:text-[15px]',
              isActive ? 'text-primary' : 'text-text-muted hover:text-text'
            )
          }
        >
          <Icon className="h-6 w-6" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
