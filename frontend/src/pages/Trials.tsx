import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Input, Select } from '@/components/Field'
import { Button } from '@/components/Button'
import { TrialCard } from '@/components/TrialCard'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorRetry } from '@/components/ErrorRetry'
import { SearchIcon, CloseIcon } from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { useDebounced } from '@/hooks/useDebounced'
import { api } from '@/mock/mockApi'

const PAGE_SIZE = 24

interface Filters {
  disease: string
  country: string
  city: string
  sponsor: string
  phase: string
  status: string
  sex: string
  age: string
}
const EMPTY: Filters = {
  disease: '',
  country: '',
  city: '',
  sponsor: '',
  phase: '',
  status: '',
  sex: '',
  age: '',
}

export function Trials() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [offset, setOffset] = useState(0)
  const debouncedQuery = useDebounced(query, 300)

  // Filter options come from the live catalogue (dynamic — no hardcoded lists).
  const { data: facets } = useAsync(() => api.getFacets(), [])

  const { data, loading, error, reload } = useAsync(
    () =>
      api.getTrialsPage({
        query: debouncedQuery || undefined,
        disease: filters.disease || undefined,
        country: filters.country || undefined,
        city: filters.city || undefined,
        sponsor: filters.sponsor || undefined,
        phase: filters.phase || undefined,
        status: filters.status || undefined,
        sex: filters.sex || undefined,
        age: filters.age || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
    [debouncedQuery, filters, offset]
  )

  const active = useMemo(
    () => query !== '' || Object.values(filters).some(Boolean),
    [query, filters]
  )

  function setFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
    setOffset(0)
  }
  function clearAll() {
    setQuery('')
    setFilters(EMPTY)
    setOffset(0)
  }

  const total = data?.total ?? 0
  const shown = data?.items.length ?? 0

  return (
    <div>
      <Header title="Clinical Trials" />
      <div className="space-y-3 px-4 pt-4">
        <div className="relative">
          <Input
            aria-label="Search trials"
            placeholder="Search trials, conditions, cities…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOffset(0)
            }}
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

        {/* Combinable filters (options from the live catalogue) */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FacetSelect
            label="Disease"
            value={filters.disease}
            options={facets?.diseases}
            onChange={(v) => setFilter('disease', v)}
          />
          <FacetSelect
            label="Country"
            value={filters.country}
            options={facets?.countries}
            onChange={(v) => setFilter('country', v)}
          />
          <FacetSelect
            label="City"
            value={filters.city}
            options={facets?.cities}
            onChange={(v) => setFilter('city', v)}
          />
          <FacetSelect
            label="Phase"
            value={filters.phase}
            options={facets?.phases}
            onChange={(v) => setFilter('phase', v)}
          />
          <FacetSelect
            label="Status"
            value={filters.status}
            options={facets?.statuses}
            onChange={(v) => setFilter('status', v)}
          />
          <FacetSelect
            label="Sponsor"
            value={filters.sponsor}
            options={facets?.sponsors}
            onChange={(v) => setFilter('sponsor', v)}
          />
          <Select
            label="Sex"
            value={filters.sex}
            onChange={(e) => setFilter('sex', e.target.value)}
          >
            <option value="">Any</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </Select>
          <Input
            label="Age"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Any"
            value={filters.age}
            onChange={(e) => setFilter('age', e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 py-4">
        {loading && <SkeletonList count={6} />}
        {!loading && error && (
          <ErrorRetry message="Couldn’t load trials." onRetry={reload} />
        )}
        {!loading && !error && data && shown === 0 && (
          <EmptyState
            icon={<SearchIcon className="h-8 w-8" />}
            title="No trials match your filters"
            body="Try broadening your search or clearing some filters."
            actionLabel={active ? 'Clear all filters' : undefined}
            onAction={active ? clearAll : undefined}
          />
        )}
        {!loading && !error && data && shown > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-text-muted text-sm" aria-live="polite">
                {total.toLocaleString()} {total === 1 ? 'trial' : 'trials'}
                {active ? ' found' : ''}
              </p>
              {active && (
                <button
                  onClick={clearAll}
                  className="text-primary rounded-sm text-sm underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((trial) => (
                <TrialCard
                  key={trial.id}
                  trial={trial}
                  onOpen={(t) => navigate(`/trials/${t.id}`)}
                />
              ))}
            </div>
            {total > PAGE_SIZE && (
              <div className="mt-5 flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <span className="text-text-muted font-mono text-xs">
                  {offset + 1}–{offset + shown} of {total.toLocaleString()}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[] | undefined
  onChange: (value: string) => void
}) {
  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All {label.toLowerCase()}</option>
      {(options ?? []).map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
  )
}
