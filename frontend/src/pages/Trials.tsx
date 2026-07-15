import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import type { TrialFacets } from '@/types'

type SuggestKey = 'disease' | 'country' | 'city' | 'sponsor'
interface Suggestion {
  key: SuggestKey
  label: string
}
const SUGGEST_LABELS: Record<SuggestKey, string> = {
  disease: 'Disease',
  country: 'Country',
  city: 'City',
  sponsor: 'Sponsor',
}

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
  const [params] = useSearchParams()
  // Initialise from URL query params so dashboard shortcuts / shared links can
  // deep-link into a pre-filtered search (frontend-only; no API change).
  const [query, setQuery] = useState(() => params.get('query') ?? '')
  const [filters, setFilters] = useState<Filters>(() => ({
    disease: params.get('disease') ?? '',
    country: params.get('country') ?? '',
    city: params.get('city') ?? '',
    sponsor: params.get('sponsor') ?? '',
    phase: params.get('phase') ?? '',
    status: params.get('status') ?? '',
    sex: params.get('sex') ?? '',
    age: params.get('age') ?? '',
  }))
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
        <SearchBox
          query={query}
          facets={facets}
          onQueryChange={(v) => {
            setQuery(v)
            setOffset(0)
          }}
          onPick={(key, value) => {
            setQuery('')
            setFilter(key, value)
          }}
        />

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

/**
 * Accessible search combobox with autocomplete. Suggestions are drawn from the
 * live facets (diseases / countries / cities / sponsors); picking one applies
 * that filter, while free text stays as a keyword query. Follows the WAI-ARIA
 * combobox pattern (roles, aria-activedescendant, arrow/enter/escape keys).
 */
function SearchBox({
  query,
  facets,
  onQueryChange,
  onPick,
}: {
  query: string
  facets: TrialFacets | null | undefined
  onQueryChange: (v: string) => void
  onPick: (key: SuggestKey, value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2 || !facets) return []
    const match = (list?: string[]) =>
      (list ?? []).filter((l) => l.toLowerCase().includes(q))
    const out: Suggestion[] = [
      ...match(facets.diseases)
        .slice(0, 3)
        .map((label) => ({ key: 'disease' as const, label })),
      ...match(facets.countries)
        .slice(0, 2)
        .map((label) => ({ key: 'country' as const, label })),
      ...match(facets.cities)
        .slice(0, 3)
        .map((label) => ({ key: 'city' as const, label })),
      ...match(facets.sponsors)
        .slice(0, 2)
        .map((label) => ({ key: 'sponsor' as const, label })),
    ]
    return out.slice(0, 8)
  }, [query, facets])

  const showList = open && suggestions.length > 0

  function choose(s: Suggestion) {
    onPick(s.key, s.label)
    setOpen(false)
    setActive(-1)
  }

  return (
    <div className="relative">
      <SearchIcon
        className="text-text-muted pointer-events-none absolute top-3 left-3 h-4 w-4"
        aria-hidden
      />
      <Input
        role="combobox"
        aria-expanded={showList}
        aria-controls="trials-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `trials-sug-${active}` : undefined}
        aria-label="Search trials"
        placeholder="Search trials, conditions, cities…"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(a + 1, suggestions.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && showList && active >= 0) {
            e.preventDefault()
            choose(suggestions[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
            setActive(-1)
          }
        }}
        className="pr-10 pl-9"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onQueryChange('')
            setOpen(false)
          }}
          className="text-text-muted hover:text-text absolute top-2.5 right-2 grid h-8 w-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
      {showList && (
        <ul
          id="trials-suggestions"
          role="listbox"
          aria-label="Search suggestions"
          className="border-border bg-surface animate-fade-in absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius-control)] border py-1 shadow-[var(--shadow-pop)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.key}-${s.label}`}
              id={`trials-sug-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(s)}
              className={
                'flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ' +
                (i === active ? 'bg-primary/10 text-text' : 'text-text')
              }
            >
              <span className="truncate">{s.label}</span>
              <span className="text-text-muted shrink-0 font-mono text-[10px] tracking-wide uppercase">
                {SUGGEST_LABELS[s.key]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
