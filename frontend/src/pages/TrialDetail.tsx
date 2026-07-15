import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { Card, SectionTitle } from '@/components/Card'
import { DiseasePill, StatusBadge, PhaseBadge } from '@/components/Badge'
import { MetaItem } from '@/components/Meta'
import { TrialCard } from '@/components/TrialCard'
import { AiResultPanel } from '@/components/AiResultPanel'
import { DisclaimerNote } from '@/components/DisclaimerNote'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonCard } from '@/components/Skeleton'
import { Input } from '@/components/Field'
import { SpinnerLabel } from '@/components/Spinner'
import {
  HeartIcon,
  MapPinIcon,
  MailIcon,
  PhoneIcon,
  CheckIcon,
  CloseIcon,
  ShareIcon,
  BuildingIcon,
  ExternalLinkIcon,
} from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { useAiAction } from '@/hooks/useAiAction'
import { useOnline } from '@/hooks/useOnline'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'
import { shareTrial } from '@/lib/share'
import { recordRecentlyViewed } from '@/hooks/useRecentlyViewed'
import type { Trial } from '@/types'

export function TrialDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const online = useOnline()
  const { isSaved, toggleSave, toast } = useApp()

  // GET /trials/:id (api → backend)
  const { data: trial, loading } = useAsync(() => api.getTrial(id), [id])

  const summary = useAiAction(() => api.summariseTrial(id))
  const criteria = useAiAction(() => api.explainCriteria(id))
  const ask = useAiAction((q: string) => api.askTrial(id, q))
  const [question, setQuestion] = useState('')

  // Clear per-trial AI results + the question when navigating to another trial,
  // so trial B never briefly shows trial A's summary/answer.
  useEffect(() => {
    summary.reset()
    criteria.reset()
    ask.reset()
    setQuestion('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Track for the dashboard's "Continue browsing" (client-only, localStorage).
  useEffect(() => {
    if (trial) recordRecentlyViewed(trial)
  }, [trial])

  if (loading) {
    return (
      <div>
        <Header title="" back />
        <div className="space-y-4 p-4">
          <div className="flex gap-2">
            <div className="bg-text/8 h-6 w-28 animate-pulse rounded-full" />
            <div className="bg-text/8 h-6 w-24 animate-pulse rounded-full" />
          </div>
          <div className="bg-text/8 h-8 w-3/4 animate-pulse rounded-md" />
          <div className="bg-text/8 h-4 w-1/2 animate-pulse rounded-md" />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (!trial) {
    return (
      <div>
        <Header title="Trial" back />
        <EmptyState
          title="Trial not found"
          body="This study may have been removed."
          actionLabel="Back to trials"
          onAction={() => navigate('/trials')}
        />
      </div>
    )
  }

  const saved = isSaved(trial.id)

  const nav: { id: string; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'design', label: 'Study design' },
    ...(trial.centers.length ? [{ id: 'locations', label: 'Locations' }] : []),
    { id: 'contact', label: 'Contact' },
  ]

  return (
    <div>
      <Header
        title={trial.disease}
        back
        display={false}
        heading={false}
        actions={
          <>
            <IconButton
              label="Share trial"
              onClick={() => void shareTrial(trial, toast)}
            >
              <ShareIcon className="text-text h-5 w-5" />
            </IconButton>
            <IconButton
              label={saved ? 'Remove from saved' : 'Save trial'}
              aria-pressed={saved}
              onClick={() => toggleSave(trial.id)}
            >
              <HeartIcon
                filled={saved}
                className={saved ? 'text-accent h-5 w-5' : 'text-text h-5 w-5'}
              />
            </IconButton>
          </>
        }
      />

      {/* Hero — the most important information, above the fold */}
      <div className="border-border border-b px-4 pt-4 pb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <DiseasePill disease={trial.disease} />
          <StatusBadge status={trial.status} />
          <PhaseBadge phase={trial.phase} />
        </div>
        <h1 className="font-display text-text mt-3 text-2xl leading-tight font-semibold text-balance sm:text-3xl">
          {trial.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <MetaItem icon={<MapPinIcon />}>
            {trial.city}, {trial.country}
          </MetaItem>
          {trial.sponsor && (
            <MetaItem icon={<BuildingIcon />}>{trial.sponsor}</MetaItem>
          )}
          {trial.source_id && (
            <span className="text-text-muted font-mono text-xs">
              {trial.source_id}
            </span>
          )}
        </div>
        {trial.source_url && (
          <a
            href={trial.source_url}
            target="_blank"
            rel="noreferrer noopener"
            className="border-primary text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] mt-4 inline-flex items-center gap-2 rounded-[var(--radius-control)] border px-3.5 py-2 text-sm font-medium"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            View official record on CTIS
          </a>
        )}
      </div>

      {/* Sticky section nav */}
      <nav
        aria-label="Trial sections"
        className="bg-bg/90 border-border sticky top-14 z-20 border-b backdrop-blur-md"
      >
        <div className="flex gap-1 overflow-x-auto px-3 py-2">
          {nav.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className="text-text-muted hover:text-text hover:bg-text/5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="space-y-8 px-4 py-6 pb-28">
        {/* Overview */}
        <section id="overview" className="scroll-mt-28">
          <SectionTitle>Overview</SectionTitle>
          <p className="text-text text-[15px] leading-relaxed">
            {trial.full_description}
          </p>
          {(trial.medical_condition ||
            trial.therapeutic_area ||
            trial.intervention) && (
            <div className="border-border bg-surface-muted mt-4 grid gap-x-6 gap-y-3 rounded-[var(--radius-card)] border p-4 sm:grid-cols-2">
              <Fact label="Condition" value={trial.medical_condition} />
              <Fact label="Therapeutic area" value={trial.therapeutic_area} />
              <Fact label="Intervention" value={trial.intervention} />
            </div>
          )}
          <div className="mt-4">
            <AiResultPanel
              title="Plain-language summary"
              loadingLabel="Reading the study…"
              loading={summary.loading}
              error={summary.error}
              hasResult={!!summary.data}
              onRetry={() => summary.run()}
              idle={
                <div>
                  <p className="text-text-muted text-sm">
                    Get a short, plain-language overview of this study.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    disabled={!online}
                    onClick={() => summary.run()}
                  >
                    {online ? 'Explain simply' : 'Unavailable offline'}
                  </Button>
                </div>
              }
            >
              {summary.data && (
                <dl className="space-y-3 text-sm">
                  <SummaryRow
                    label="What it’s for"
                    value={summary.data.purpose}
                  />
                  <SummaryRow
                    label="Who it’s for"
                    value={summary.data.targetPatients}
                  />
                  <SummaryRow
                    label="Possible benefits"
                    value={summary.data.benefits}
                  />
                  <SummaryRow
                    label="What’s involved"
                    value={summary.data.requirements}
                  />
                </dl>
              )}
            </AiResultPanel>
          </div>
        </section>

        {/* Eligibility */}
        <section id="eligibility" className="scroll-mt-28">
          <SectionTitle>Eligibility</SectionTitle>
          {(trial.age_range || trial.gender) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {trial.age_range && (
                <FactPill label="Ages" value={trial.age_range} />
              )}
              {trial.gender && <FactPill label="Sex" value={trial.gender} />}
            </div>
          )}
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <CriteriaList
                heading="Who can take part"
                items={
                  criteria.data
                    ? criteria.data.canJoin
                    : trial.inclusion_criteria
                }
                tone="positive"
              />
              <CriteriaList
                heading="Who cannot take part"
                items={
                  criteria.data
                    ? criteria.data.cannotJoin
                    : trial.exclusion_criteria
                }
                tone="neutral"
              />
            </div>
            <div className="mt-4">
              {criteria.loading && (
                <SpinnerLabel label="Rewriting in plain language…" />
              )}
              {!criteria.loading && criteria.error && (
                <p className="text-text-muted text-sm">
                  Couldn’t simplify the criteria right now — the original text
                  is shown above.{' '}
                  <button
                    className="text-primary rounded-sm underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                    onClick={() => criteria.run()}
                  >
                    Try again
                  </button>
                </p>
              )}
              {!criteria.loading && !criteria.error && !criteria.data && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!online}
                  onClick={() => criteria.run()}
                >
                  {online ? 'Explain in plain language' : 'Unavailable offline'}
                </Button>
              )}
              {criteria.data && <DisclaimerNote className="mt-1" />}
            </div>
          </Card>

          {/* Ask about this trial (RAG) */}
          <Card className="mt-4">
            <h3 className="font-display text-text mb-1 font-semibold">
              Ask about this trial
            </h3>
            <p className="text-text-muted mb-3 text-sm">
              Ask a question in your own words. Answers come only from this
              study’s text.
            </p>
            <div className="flex gap-2">
              <Input
                aria-label="Your question about this trial"
                placeholder="e.g. Can I join if I have hypertension?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1"
              />
              <Button
                disabled={!question.trim() || ask.loading || !online}
                loading={ask.loading}
                loadingLabel="Checking…"
                onClick={() => ask.run(question.trim())}
              >
                Ask
              </Button>
            </div>
            {!online && (
              <p className="text-text-muted mt-2 text-xs">
                Unavailable offline.
              </p>
            )}
            {ask.loading && (
              <div className="mt-3">
                <SpinnerLabel label="Checking the protocol…" />
              </div>
            )}
            {!ask.loading && ask.error && (
              <p className="text-text mt-3 text-sm">
                The assistant couldn’t answer right now.{' '}
                <button
                  className="text-primary rounded-sm underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                  onClick={() => ask.run(question.trim())}
                >
                  Try again
                </button>
              </p>
            )}
            {!ask.loading && ask.data && (
              <div className="mt-3" aria-live="polite">
                <p className="text-text text-sm">{ask.data.answer}</p>
                <p className="text-text-muted mt-2 font-mono text-xs">
                  Source: {ask.data.citedSection}
                </p>
                <DisclaimerNote className="mt-2">
                  {ask.data.note}
                </DisclaimerNote>
              </div>
            )}
          </Card>
        </section>

        {/* Study design */}
        <section id="design" className="scroll-mt-28">
          <SectionTitle>Study design</SectionTitle>
          <Card>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Fact label="Phase" value={trial.phase} />
              <Fact label="Recruitment status" value={statusText(trial)} />
              <Fact label="Age range" value={trial.age_range} />
              <Fact label="Sex" value={trial.gender} />
            </div>
            {trial.countries && trial.countries.length > 0 && (
              <div className="mt-4">
                <p className="text-text-muted mb-2 font-mono text-xs uppercase">
                  Recruiting countries
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {trial.countries.map((c) => (
                    <span
                      key={c}
                      className="border-border bg-surface-muted text-text inline-flex items-center rounded-full border px-2.5 py-1 text-xs"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Locations */}
        {trial.centers.length > 0 && (
          <section id="locations" className="scroll-mt-28">
            <SectionTitle>Locations</SectionTitle>
            <Card>
              <ul className="divide-border divide-y">
                {trial.centers.map((c) => (
                  <li
                    key={`${c.name}-${c.city}`}
                    className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <MapPinIcon className="text-text-muted mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-text text-sm font-medium">{c.name}</p>
                      <p className="text-text-muted text-sm">
                        {c.city}, {c.country}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {/* Contact */}
        <section id="contact" className="scroll-mt-28">
          <SectionTitle>Contact</SectionTitle>
          <Card className="space-y-2 text-sm">
            <p className="text-text font-medium">{trial.contact_name}</p>
            {trial.contact_email && (
              <a
                href={`mailto:${trial.contact_email}`}
                className="text-primary inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                <MailIcon className="h-4 w-4" />
                {trial.contact_email}
              </a>
            )}
            {trial.contact_phone && (
              <a
                href={`tel:${trial.contact_phone.replace(/\s/g, '')}`}
                className="text-primary flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                <PhoneIcon className="h-4 w-4" />
                {trial.contact_phone}
              </a>
            )}
          </Card>
        </section>

        <SimilarTrials
          disease={trial.disease}
          currentId={trial.id}
          onOpen={(t) => navigate(`/trials/${t.id}`)}
        />
      </div>

      {/* Sticky primary action */}
      <div className="border-border bg-bg/90 fixed inset-x-0 bottom-16 z-20 border-t px-4 py-3 backdrop-blur-md lg:bottom-0 lg:left-60">
        <div className="mx-auto max-w-3xl">
          <Button
            fullWidth
            onClick={() =>
              navigate('/assistant', { state: { trialId: trial.id } })
            }
          >
            Check my eligibility
          </Button>
        </div>
      </div>
    </div>
  )
}

function statusText(trial: Trial): string {
  return trial.status.charAt(0).toUpperCase() + trial.status.slice(1)
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-text-muted font-mono text-xs uppercase">{label}</dt>
      <dd className="text-text mt-0.5 text-sm">{value}</dd>
    </div>
  )
}

function FactPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="border-border bg-surface text-text inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
      <span className="text-text-muted">{label}:</span>
      <span className="font-medium">{value}</span>
    </span>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted font-mono text-xs uppercase">{label}</dt>
      <dd className="text-text mt-0.5">{value}</dd>
    </div>
  )
}

function CriteriaList({
  heading,
  items,
  tone,
}: {
  heading: string
  items: string[]
  tone: 'positive' | 'neutral'
}) {
  if (items.length === 0) return null
  return (
    <div>
      <h4 className="text-text mb-2 text-sm font-semibold">{heading}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {tone === 'positive' ? (
              <CheckIcon className="text-success mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CloseIcon className="text-text-muted mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="text-text">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** "Similar trials" — same disease area, current trial excluded. Uses the
 *  existing paginated trials API; renders nothing if there are none. */
function SimilarTrials({
  disease,
  currentId,
  onOpen,
}: {
  disease: string
  currentId: string
  onOpen: (trial: Trial) => void
}) {
  const { data } = useAsync(
    () => api.getTrialsPage({ disease, limit: 6 }),
    [disease, currentId]
  )
  const items = (data?.items ?? [])
    .filter((t) => t.id !== currentId)
    .slice(0, 3)
  if (items.length === 0) return null
  return (
    <section id="similar" className="scroll-mt-28">
      <SectionTitle>Similar trials</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <TrialCard key={t.id} trial={t} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}
