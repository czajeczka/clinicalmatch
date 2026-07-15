import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { CommunityCard } from '@/components/CommunityCard'
import { SafetyNotice } from '@/components/SafetyNotice'
import { SkeletonList } from '@/components/Skeleton'
import { ErrorRetry } from '@/components/ErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { SearchIcon, UsersIcon, HeartIcon } from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'
import type { SupportGroup } from '@/types'

export function Support() {
  const navigate = useNavigate()
  const { isJoined } = useApp()
  const [query, setQuery] = useState('')
  // GET /groups (api → backend)
  const { data, loading, error, reload } = useAsync(() => api.getGroups(), [])

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    const all = data ?? []
    if (!q) return all
    return all.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.disease.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
    )
  }, [data, q])

  const joined = filtered.filter((g) => isJoined(g.id))
  const others = filtered.filter((g) => !isJoined(g.id))
  const open = (g: SupportGroup) => navigate(`/support/${g.id}`)

  return (
    <div>
      <Header title="Communities" />
      <div className="animate-fade-in space-y-5 px-4 py-4">
        <p className="text-text-muted -mt-1 text-sm">
          Disease-specific communities. Join to introduce yourself, ask
          questions, share experiences and support others.
        </p>

        <SafetyNotice />

        {/* Search communities */}
        <div className="border-border bg-surface focus-within:border-primary/50 focus-within:ring-primary/15 relative flex items-center rounded-full border shadow-[var(--shadow-card)] transition-colors focus-within:ring-2">
          <SearchIcon className="text-text-muted pointer-events-none absolute left-3.5 h-[18px] w-[18px]" />
          <input
            type="search"
            aria-label="Search communities"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search communities…"
            className="text-text placeholder:text-text-muted h-11 w-full rounded-full bg-transparent pr-4 pl-11 text-sm outline-none"
          />
        </div>

        {loading && <SkeletonList count={4} />}
        {!loading && error && (
          <ErrorRetry message="Couldn’t load communities." onRetry={reload} />
        )}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon={<UsersIcon className="h-8 w-8" />}
            title={q ? 'No communities match' : 'No communities yet'}
            body={q ? 'Try a different search.' : 'Check back soon.'}
            {...(q
              ? { actionLabel: 'Clear search', onAction: () => setQuery('') }
              : {})}
          />
        )}

        {!loading && !error && joined.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <HeartIcon className="text-accent h-4 w-4" filled />
              <h2 className="font-display text-text text-lg font-semibold">
                Your communities
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {joined.map((g) => (
                <CommunityCard key={g.id} group={g} onOpen={open} />
              ))}
            </div>
          </section>
        )}

        {!loading && !error && others.length > 0 && (
          <section>
            {joined.length > 0 && (
              <h2 className="font-display text-text mb-3 text-lg font-semibold">
                Discover more
              </h2>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {others.map((g) => (
                <CommunityCard key={g.id} group={g} onOpen={open} />
              ))}
            </div>
          </section>
        )}

        <div className="pt-1">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate('/support/buddies')}
          >
            <UsersIcon className="h-4 w-4" />
            Find a buddy across communities
          </Button>
        </div>
      </div>
    </div>
  )
}
