import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Input } from '@/components/Field'
import { Chip } from '@/components/Chip'
import { TrialCard } from '@/components/TrialCard'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorRetry } from '@/components/ErrorRetry'
import { SearchIcon, CloseIcon } from '@/components/icons'
import { DISEASES, type Disease } from '@/lib/diseases'
import { useAsync } from '@/hooks/useAsync'
import { useDebounced } from '@/hooks/useDebounced'
import { api } from '@/mock/mockApi'

export function Trials() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [disease, setDisease] = useState<Disease | 'all'>('all')
  const debouncedQuery = useDebounced(query, 300)

  // GET /trials?query=&disease= (api → backend)
  const { data, loading, error, reload } = useAsync(
    () => api.getTrials({ query: debouncedQuery, disease }),
    [debouncedQuery, disease]
  )

  const filtered = query !== '' || disease !== 'all'

  return (
    <div>
      <Header title="Clinical Trials" />
      <div className="px-4 pt-4">
        <div className="relative">
          <Input
            aria-label="Search trials"
            placeholder="Search trials, conditions, cities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-10"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="text-text-muted hover:text-text absolute top-2.5 right-2 grid h-8 w-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter by condition"
        >
          <Chip selected={disease === 'all'} onClick={() => setDisease('all')}>
            All
          </Chip>
          {DISEASES.map((d) => (
            <Chip
              key={d}
              selected={disease === d}
              onClick={() => setDisease(d)}
            >
              {d}
            </Chip>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {loading && <SkeletonList count={4} />}

        {!loading && error && (
          <ErrorRetry message="Couldn’t load trials." onRetry={reload} />
        )}

        {!loading && !error && data && data.length === 0 && (
          <EmptyState
            icon={<SearchIcon className="h-8 w-8" />}
            title="No trials match your search"
            body="Try a different keyword or clear the filters."
            actionLabel={filtered ? 'Clear filters' : undefined}
            onAction={
              filtered
                ? () => {
                    setQuery('')
                    setDisease('all')
                  }
                : undefined
            }
          />
        )}

        {!loading && !error && data && data.length > 0 && (
          <>
            <p className="text-text-muted mb-3 text-sm" aria-live="polite">
              {data.length} {data.length === 1 ? 'trial' : 'trials'}
              {filtered ? ' found' : ''}
            </p>
            <div
              className={
                'grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ' +
                (query !== debouncedQuery ? 'opacity-60' : '')
              }
            >
              {data.map((trial) => (
                <TrialCard
                  key={trial.id}
                  trial={trial}
                  onOpen={(t) => navigate(`/trials/${t.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
