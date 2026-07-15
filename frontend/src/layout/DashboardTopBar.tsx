import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Popover } from '@/components/Popover'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { useApp } from '@/store/store'
import { api } from '@/mock/mockApi'
import {
  LogoMark,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  UserIcon,
  HeartIcon,
  ShieldIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
} from '@/components/icons'
import type { AppNotification } from '@/types'

interface DashboardTopBarProps {
  notifications: AppNotification[]
  /** Called after a notification is marked read, so the owner can refetch. */
  onNotificationsChange?: () => void
}

/**
 * Professional dashboard top bar: brand, global trial search, a notifications
 * popover and a user/account menu. Navigation and data all go through existing
 * routes + the existing API (global search deep-links into /trials; the bell
 * reuses getNotifications / markNotificationRead). No backend changes.
 */
export function DashboardTopBar({
  notifications,
  onNotificationsChange,
}: DashboardTopBarProps) {
  const navigate = useNavigate()
  const { user, isAdmin } = useApp()
  const [query, setQuery] = useState('')

  const unread = notifications.filter((n) => !n.read).length
  const name = user?.display_name ?? 'You'
  const initials = getInitials(name)

  function submitSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/trials?query=${encodeURIComponent(q)}` : '/trials')
  }

  function openNotification(n: AppNotification, close: () => void) {
    if (!n.read) {
      api
        .markNotificationRead(n.id)
        .then(() => onNotificationsChange?.())
        .catch(() => {})
    }
    close()
    if (n.trial_id) navigate(`/trials/${n.trial_id}`)
  }

  return (
    <header className="bg-bg/80 border-border sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="flex min-h-16 items-center gap-2 px-4 sm:gap-3">
        {/* Brand */}
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="ClinicalMatch home"
          className="flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] py-1 pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          <LogoMark className="h-7 w-7" />
          <span className="font-display text-text hidden text-lg font-semibold sm:inline">
            ClinicalMatch
          </span>
        </button>

        {/* Global search */}
        <form role="search" onSubmit={submitSearch} className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="global-search">
            Search trials, conditions, cities
          </label>
          <div className="group border-border bg-surface focus-within:border-primary/50 focus-within:ring-primary/15 relative flex items-center rounded-full border shadow-[var(--shadow-card)] transition-colors focus-within:ring-2">
            <SearchIcon className="text-text-muted pointer-events-none absolute left-3.5 h-[18px] w-[18px]" />
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search trials, conditions, cities…"
              enterKeyHint="search"
              className="text-text placeholder:text-text-muted h-11 w-full min-w-0 rounded-full bg-transparent pr-4 pl-11 text-sm outline-none"
            />
          </div>
        </form>

        {/* Notifications */}
        <Popover
          label={
            unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'
          }
          align="right"
          triggerClassName="h-11 w-11 text-text shrink-0"
          panelClassName="w-[min(22rem,calc(100vw-2rem))]"
          trigger={
            <>
              <BellIcon className="h-[22px] w-[22px]" />
              {unread > 0 && (
                <span
                  className="bg-accent text-[var(--color-on-accent)] absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                  aria-hidden
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </>
          }
        >
          {(close) => (
            <div>
              <div className="border-border flex items-center justify-between border-b px-4 py-3">
                <h2 className="font-display text-text text-sm font-semibold">
                  Notifications
                </h2>
                {unread > 0 && (
                  <span className="bg-accent/12 text-accent rounded-full px-2 py-0.5 font-mono text-xs font-medium">
                    {unread} new
                  </span>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-text-muted px-4 py-8 text-center text-sm">
                  You’re all caught up.
                </p>
              ) : (
                <ul className="max-h-[22rem] overflow-y-auto">
                  {notifications.slice(0, 8).map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openNotification(n, close)}
                        className="hover:bg-surface-muted flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                      >
                        <span
                          className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            n.read ? 'bg-transparent' : 'bg-accent'
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="text-text block text-sm font-medium">
                            {n.title}
                          </span>
                          <span className="text-text-muted line-clamp-2 block text-sm">
                            {n.body}
                          </span>
                          <span className="text-text-muted mt-1 block font-mono text-xs">
                            {timeAgo(n.created_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Popover>

        {/* Account */}
        <Popover
          label="Your account"
          align="right"
          triggerClassName="h-11 gap-1.5 pl-1 pr-2 shrink-0"
          panelClassName="w-64"
          trigger={
            <>
              <span
                className="bg-primary/12 text-primary font-display grid h-8 w-8 place-items-center rounded-full text-sm font-semibold"
                aria-hidden
              >
                {initials}
              </span>
              <ChevronDownIcon className="text-text-muted hidden h-4 w-4 sm:block" />
            </>
          }
        >
          {(close) => (
            <div>
              <div className="border-border border-b px-4 py-3">
                <p className="text-text truncate text-sm font-semibold">
                  {name}
                </p>
                <p className="text-text-muted truncate text-xs">
                  {user?.email ?? 'On this device'}
                </p>
              </div>
              <div className="p-1.5">
                <MenuItem
                  icon={<UserIcon className="h-[18px] w-[18px]" />}
                  label="Profile"
                  onClick={() => {
                    close()
                    navigate('/profile')
                  }}
                />
                <MenuItem
                  icon={<HeartIcon className="h-[18px] w-[18px]" />}
                  label="Saved trials"
                  onClick={() => {
                    close()
                    navigate('/profile')
                  }}
                />
                {isAdmin && (
                  <MenuItem
                    icon={<ShieldIcon className="h-[18px] w-[18px]" />}
                    label="Admin panel"
                    onClick={() => {
                      close()
                      navigate('/admin')
                    }}
                  />
                )}
              </div>
              <div className="border-border border-t px-3 py-3">
                <ThemeToggle />
              </div>
            </div>
          )}
        </Popover>
      </div>
    </header>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-text hover:bg-surface-muted flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus)]"
    >
      <span className="text-text-muted">{icon}</span>
      {label}
    </button>
  )
}

const THEME_OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: 'system', label: 'System', Icon: MonitorIcon },
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
]

function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  return (
    <div>
      <p className="text-text-muted mb-1.5 px-1 font-mono text-[11px] uppercase">
        Appearance
      </p>
      <div
        role="group"
        aria-label="Theme"
        className="border-border bg-surface-muted grid grid-cols-3 gap-1 rounded-[10px] border p-1"
      >
        {THEME_OPTIONS.map(({ value, label, Icon }) => {
          const active = theme === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={active}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-[7px] py-1.5 text-xs font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus)]',
                active
                  ? 'bg-surface text-primary shadow-[var(--shadow-card)]'
                  : 'text-text-muted hover:text-text'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'You'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
