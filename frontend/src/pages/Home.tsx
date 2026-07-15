import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardTopBar } from '@/layout/DashboardTopBar'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { TrialCard } from '@/components/TrialCard'
import { StatTile } from '@/components/StatTile'
import { FeatureCard } from '@/components/FeatureCard'
import { MedicalIllustration } from '@/components/MedicalIllustration'
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
  ActivityIcon,
  GlobeIcon,
  FlaskIcon,
  ShieldIcon,
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

interface PlatformStats {
  totalTrials: number
  recruiting: number
  countries: number
  diseases: number
}

/** Live platform statistics for the hero — derived from the existing trials +
 *  facets endpoints (no new API). `total` counts come back from the paginated
 *  list without fetching the rows themselves (limit 1). */
async function loadPlatformStats(): Promise<PlatformStats> {
  const [all, recruiting, facets] = await Promise.all([
    api.getTrialsPage({ limit: 1 }),
    api.getTrialsPage({ status: 'recruiting', limit: 1 }),
    api.getFacets(),
  ])
  return {
    totalTrials: all.total,
    recruiting: recruiting.total,
    countries: facets.countries.length,
    diseases: facets.diseases.length,
  }
}

const HERO_BG: CSSProperties = {
  background:
    'radial-gradient(42rem 24rem at 12% -30%, color-mix(in oklab, var(--color-primary) 18%, transparent), transparent 70%),' +
    'radial-gradient(34rem 22rem at 108% 0%, color-mix(in oklab, var(--color-secondary) 16%, transparent), transparent 70%)',
}

export function Home() {
  const navigate = useNavigate()
  const { user, savedTrialIds, joinedGroupIds } = useApp()
  const name = user?.display_name ?? 'there'
  const interests = useMemo(() => user?.interests ?? [], [user])
  const recent = useRecentlyViewed()

  const saved = useAsync(() => api.getSavedTrials(), [savedTrialIds.length])
  const notifications = useAsync(() => api.getNotifications(), [])
  const stats = useAsync(() => loadPlatformStats(), [])
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

  const s = stats.data

  return (
    <div>
      <DashboardTopBar
        notifications={notifications.data ?? []}
        onNotificationsChange={notifications.reload}
      />

      <div className="animate-fade-in space-y-8 px-4 py-5 pb-10">
        {/* Hero */}
        <section
          className="border-border relative overflow-hidden rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-card)] sm:p-7"
          style={HERO_BG}
        >
          <div className="items-center gap-6 md:grid md:grid-cols-[1.5fr_1fr]">
            <div>
              <span className="border-border bg-surface/70 text-text-muted inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur">
                <span
                  className="bg-accent h-1.5 w-1.5 rounded-full"
                  aria-hidden
                />
                Real European trials · powered by CTIS
              </span>
              <h1 className="font-display text-text mt-4 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-[2rem]">
                Welcome back, {name}
              </h1>
              <p className="text-text-muted mt-2 max-w-lg text-sm leading-relaxed sm:text-[15px]">
                {interests.length > 0
                  ? 'Here are recruiting European trials for the conditions you follow, plus your saved studies and recent activity.'
                  : 'Add a few conditions to your profile and we’ll tailor trial recommendations to you.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Button className="px-5" onClick={() => navigate('/trials')}>
                  Find trials
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/assistant')}
                >
                  Eligibility self-check
                </Button>
              </div>
            </div>

            <div className="hidden md:block">
              <MedicalIllustration className="mx-auto h-auto w-full max-w-[300px]" />
            </div>
          </div>

          {/* Live platform statistics */}
          <div className="border-border/60 mt-6 grid grid-cols-2 gap-3 border-t pt-6 sm:grid-cols-4">
            <HeroStat
              icon={<FlaskIcon className="h-[18px] w-[18px]" />}
              value={s?.totalTrials}
              label="Active trials"
              loading={stats.loading}
              error={!!stats.error}
            />
            <HeroStat
              icon={<ActivityIcon className="h-[18px] w-[18px]" />}
              value={s?.recruiting}
              label="Recruiting now"
              loading={stats.loading}
              error={!!stats.error}
            />
            <HeroStat
              icon={<GlobeIcon className="h-[18px] w-[18px]" />}
              value={s?.countries}
              label="Countries"
              loading={stats.loading}
              error={!!stats.error}
            />
            <HeroStat
              icon={<SparkIcon className="h-[18px] w-[18px]" />}
              value={s?.diseases}
              label="Disease areas"
              loading={stats.loading}
              error={!!stats.error}
            />
          </div>
        </section>

        {/* Your activity */}
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

        {/* Quick actions */}
        <DashboardSection title="Quick actions">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FeatureCard
              tone="primary"
              icon={<SearchIcon className="h-5 w-5" />}
              title="Find trials"
              description="Search recruiting European studies by condition, country and phase."
              onClick={() => navigate('/trials')}
            />
            <FeatureCard
              tone="accent"
              icon={<SparkIcon className="h-5 w-5" />}
              title="Eligibility self-check"
              description="See who a study is for in plain language — informational only."
              onClick={() => navigate('/assistant')}
            />
            <FeatureCard
              tone="secondary"
              icon={<UsersIcon className="h-5 w-5" />}
              title="Communities"
              description="Connect with people navigating the same condition."
              onClick={() => navigate('/support')}
            />
          </div>
          {interests.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-text-muted mr-1 text-xs font-medium">
                Jump back in
              </span>
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
        <DashboardSection
          title="Recommended for you"
          action={
            recommendations.length > 0
              ? { label: 'Browse all', onClick: () => navigate('/trials') }
              : undefined
          }
        >
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="flex flex-col gap-2.5">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Card className="grid gap-5 sm:grid-cols-2">
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
            <div className="flex flex-col gap-2.5">
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

        {/* Safety framing — informational only, never medical advice. */}
        <p className="text-text-muted flex items-center justify-center gap-1.5 pt-1 text-center text-xs">
          <ShieldIcon className="h-3.5 w-3.5 shrink-0" />
          Informational only — never medical advice. Final eligibility is
          decided by the trial investigators.
        </p>
      </div>
    </div>
  )
}

function HeroStat({
  icon,
  value,
  label,
  loading,
  error,
}: {
  icon: ReactNode
  value?: number
  label: string
  loading: boolean
  error: boolean
}) {
  return (
    <div className="border-border bg-surface/70 flex items-center gap-3 rounded-[var(--radius-control)] border p-3 backdrop-blur">
      <span className="bg-primary/10 text-primary grid h-9 w-9 shrink-0 place-items-center rounded-[10px]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-display text-text text-xl leading-none font-semibold">
          {loading ? (
            <span className="bg-text/10 inline-block h-5 w-10 animate-pulse rounded" />
          ) : error || value == null ? (
            '—'
          ) : (
            value.toLocaleString()
          )}
        </div>
        <p className="text-text-muted mt-1 truncate text-xs font-medium">
          {label}
        </p>
      </div>
    </div>
  )
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SkeletonCard />
      <SkeletonCard />
    </div>
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
