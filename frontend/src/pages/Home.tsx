import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { TrialCard } from '@/components/TrialCard'
import { StatTile } from '@/components/StatTile'
import { DashboardSection } from '@/components/DashboardSection'
import { SkeletonCard } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorRetry } from '@/components/ErrorRetry'
import { DiseasePill } from '@/components/Badge'
import { MetaItem } from '@/components/Meta'
import {
  SearchIcon,
  SparkIcon,
  UsersIcon,
  HeartIcon,
  MapPinIcon,
} from '@/components/icons'
import { timeAgo } from '@/lib/format'
import { useAsync } from '@/hooks/useAsync'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'
import type { Trial } from '@/types'

/** Recommendations: recruiting trials in the user's preferred conditions,
 *  excluding already-saved ones. Falls back to recent recruiting trials when no
 *  interests are set. Uses only the existing paginated trials API. */
async function buildRecommendations(
  interests: string[],
  savedIds: string[]
): Promise<Trial[]> {
  const saved = new Set(savedIds)
  const seen = new Set<string>()
  const pool: Trial[] = []
  const add = (items: Trial[]) => {
    for (const t of items) {
      if (!seen.has(t.id) && !saved.has(t.id)) {
        seen.add(t.id)
        pool.push(t)
      }
    }
  }
  if (interests.length === 0) {
    add((await api.getTrialsPage({ status: 'recruiting', limit: 12 })).items)
  } else {
    const pages = await Promise.all(
      interests
        .slice(0, 4)
        .map((d) =>
          api.getTrialsPage({ disease: d, status: 'recruiting', limit: 6 })
        )
    )
    for (const p of pages) add(p.items)
  }
  return pool
}

const HERO_BG: CSSProperties = {
  background:
    'radial-gradient(38rem 22rem at 15% -20%, color-mix(in oklab, var(--color-primary) 16%, transparent), transparent 70%),' +
    'radial-gradient(30rem 20rem at 100% 0%, color-mix(in oklab, var(--color-secondary) 14%, transparent), transparent 70%)',
}

export function Home() {
  const navigate = useNavigate()
  const { user, savedTrialIds, joinedGroupIds } = useApp()
  const name = user?.display_name ?? 'there'
  const interests = useMemo(() => user?.interests ?? [], [user])
  const recent = useRecentlyViewed()

  const saved = useAsync(() => api.getSavedTrials(), [savedTrialIds.length])
  const notifications = useAsync(() => api.getNotifications(), [])
  const rec = useAsync(
    () => buildRecommendations(interests, savedTrialIds),
    [interests.join('|'), savedTrialIds.length]
  )

  // "Preferred countries" derived from saved trials (no schema change).
  const preferredCountries = useMemo(() => {
    const set = new Set<string>()
    for (const t of saved.data ?? []) if (t.country) set.add(t.country)
    return [...set].slice(0, 8)
  }, [saved.data])

  // Rank recommendations so preferred-country trials come first.
  const recommendations = useMemo(() => {
    const items = rec.data ?? []
    const pref = new Set(preferredCountries.map((c) => c.toLowerCase()))
    const score = (t: Trial) =>
      t.country && pref.has(t.country.toLowerCase()) ? 1 : 0
    return [...items].sort((a, b) => score(b) - score(a)).slice(0, 6)
  }, [rec.data, preferredCountries])

  const savedPreview = (saved.data ?? []).slice(0, 4)
  const toTrials = (params: Record<string, string>) =>
    navigate(`/trials?${new URLSearchParams(params).toString()}`)

  return (
    <div>
      <Header title="Dashboard" />
      <div className="animate-fade-in space-y-7 px-4 py-4 pb-8">
        {/* Welcome */}
        <section
          className="border-border relative overflow-hidden rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-card)] sm:p-6"
          style={HERO_BG}
        >
          <h1 className="font-display text-text text-2xl font-semibold sm:text-3xl">
            Welcome back, {name}
          </h1>
          <p className="text-text-muted mt-1.5 max-w-lg text-sm leading-relaxed">
            {interests.length > 0
              ? 'Here are recruiting European trials for the conditions you follow, plus your saved studies and recent activity.'
              : 'Add a few conditions to your profile and we’ll tailor trial recommendations to you.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="px-5" onClick={() => navigate('/trials')}>
              Find trials
            </Button>
            <Button variant="secondary" onClick={() => navigate('/assistant')}>
              Eligibility self-check
            </Button>
          </div>
        </section>

        {/* Quick statistics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Saved trials"
            value={savedTrialIds.length}
            icon={<HeartIcon className="h-5 w-5" />}
            onClick={() => navigate('/profile')}
          />
          <StatTile
            label="Communities"
            value={joinedGroupIds.length}
            icon={<UsersIcon className="h-5 w-5" />}
            onClick={() => navigate('/support')}
          />
          <StatTile
            label="Recommended"
            value={recommendations.length}
            icon={<SparkIcon className="h-5 w-5" />}
          />
          <StatTile
            label="Recently viewed"
            value={recent.length}
            icon={<SearchIcon className="h-5 w-5" />}
          />
        </div>

        {/* Search shortcuts */}
        <DashboardSection title="Quick actions">
          <div className="grid grid-cols-3 gap-3">
            <QuickAction
              icon={<SearchIcon className="h-5 w-5" />}
              label="Find trials"
              onClick={() => navigate('/trials')}
            />
            <QuickAction
              icon={<SparkIcon className="h-5 w-5" />}
              label="Self-check"
              onClick={() => navigate('/assistant')}
            />
            <QuickAction
              icon={<UsersIcon className="h-5 w-5" />}
              label="Support"
              onClick={() => navigate('/support')}
            />
          </div>
          {interests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {interests.map((d) => (
                <ShortcutChip
                  key={d}
                  onClick={() => toTrials({ disease: d, status: 'recruiting' })}
                >
                  {d}
                </ShortcutChip>
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Recommendations */}
        <DashboardSection title="Recommended for you">
          {rec.loading ? (
            <CardGridSkeleton />
          ) : rec.error ? (
            <ErrorRetry
              message="Couldn’t load recommendations."
              onRetry={rec.reload}
            />
          ) : recommendations.length === 0 ? (
            interests.length === 0 ? (
              <EmptyState
                icon={<SparkIcon className="h-8 w-8" />}
                title="Get tailored recommendations"
                body="Choose the conditions you care about and we’ll surface matching recruiting trials."
                actionLabel="Set your interests"
                onAction={() => navigate('/profile')}
              />
            ) : (
              <p className="text-text-muted text-sm">
                No new recommendations right now — you may have saved them all.
              </p>
            )
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((t) => (
                <TrialCard
                  key={t.id}
                  trial={t}
                  onOpen={(tr) => navigate(`/trials/${tr.id}`)}
                />
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Continue browsing (recently viewed) */}
        {recent.length > 0 && (
          <DashboardSection
            title="Continue browsing"
            action={{ label: 'Browse all', onClick: () => navigate('/trials') }}
          >
            <div className="flex flex-col gap-2">
              {recent.slice(0, 4).map((t) => (
                <Card
                  key={t.id}
                  interactive
                  onClick={() => navigate(`/trials/${t.id}`)}
                  className="flex items-center gap-3 py-3"
                >
                  <DiseasePill disease={t.disease} />
                  <span className="text-text min-w-0 flex-1 truncate text-sm font-medium">
                    {t.title}
                  </span>
                  <MetaItem
                    icon={<MapPinIcon />}
                    className="hidden shrink-0 sm:flex"
                  >
                    {t.city}, {t.country}
                  </MetaItem>
                </Card>
              ))}
            </div>
          </DashboardSection>
        )}

        {/* Saved trials */}
        <DashboardSection
          title="Saved trials"
          action={
            savedPreview.length > 0
              ? { label: 'View all', onClick: () => navigate('/profile') }
              : undefined
          }
        >
          {saved.loading ? (
            <CardGridSkeleton />
          ) : savedPreview.length === 0 ? (
            <EmptyState
              icon={<HeartIcon className="h-8 w-8" />}
              title="No saved trials yet"
              body="Bookmark a trial to keep it here for quick access."
              actionLabel="Browse trials"
              onAction={() => navigate('/trials')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedPreview.map((t) => (
                <TrialCard
                  key={t.id}
                  trial={t}
                  onOpen={(tr) => navigate(`/trials/${tr.id}`)}
                />
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Preferences */}
        <DashboardSection
          title="Your preferences"
          action={{ label: 'Edit', onClick: () => navigate('/profile') }}
        >
          <Card className="space-y-4">
            <div>
              <p className="text-text-muted mb-2 font-mono text-xs uppercase">
                Preferred conditions
              </p>
              {interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {interests.map((d) => (
                    <ShortcutChip
                      key={d}
                      onClick={() => toTrials({ disease: d })}
                    >
                      {d}
                    </ShortcutChip>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm">
                  None yet — add conditions in your profile.
                </p>
              )}
            </div>
            <div>
              <p className="text-text-muted mb-2 font-mono text-xs uppercase">
                Preferred countries
              </p>
              {preferredCountries.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {preferredCountries.map((c) => (
                    <ShortcutChip
                      key={c}
                      onClick={() => toTrials({ country: c })}
                    >
                      {c}
                    </ShortcutChip>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm">
                  Save trials and the countries you explore will appear here.
                </p>
              )}
            </div>
          </Card>
        </DashboardSection>

        {/* Recent updates */}
        <DashboardSection title="Recent updates">
          {notifications.error ? (
            <p className="text-text-muted text-sm">
              Couldn’t load recent updates right now.
            </p>
          ) : notifications.data && notifications.data.length > 0 ? (
            <div className="flex flex-col gap-2">
              {notifications.data.slice(0, 4).map((n) => (
                <Card
                  key={n.id}
                  interactive={!!n.trial_id}
                  onClick={
                    n.trial_id
                      ? () => navigate(`/trials/${n.trial_id}`)
                      : undefined
                  }
                  className="flex items-start gap-3"
                >
                  <span
                    className={
                      'mt-1 h-2 w-2 shrink-0 rounded-full ' +
                      (n.read ? 'bg-transparent' : 'bg-accent')
                    }
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-text text-sm font-medium">{n.title}</p>
                    <p className="text-text-muted text-sm">{n.body}</p>
                    <p className="text-text-muted mt-1 font-mono text-xs">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">Nothing new right now.</p>
          )}
        </DashboardSection>
      </div>
    </div>
  )
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border bg-surface text-text flex flex-col items-center gap-2 rounded-[var(--radius-card)] border p-4 text-sm font-medium shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </button>
  )
}

function ShortcutChip({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border bg-surface text-text hover:border-primary/50 hover:text-primary inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
    >
      {children}
    </button>
  )
}
