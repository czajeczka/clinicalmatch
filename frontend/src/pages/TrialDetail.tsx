import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { Card, SectionTitle } from '@/components/Card'
import { DiseasePill, StatusBadge } from '@/components/Badge'
import { AiResultPanel } from '@/components/AiResultPanel'
import { DisclaimerNote } from '@/components/DisclaimerNote'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { Input } from '@/components/Field'
import { SpinnerLabel } from '@/components/Spinner'
import {
  HeartIcon,
  MapPinIcon,
  MailIcon,
  PhoneIcon,
  CheckIcon,
  CloseIcon,
} from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { useAiAction } from '@/hooks/useAiAction'
import { useOnline } from '@/hooks/useOnline'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'

export function TrialDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const online = useOnline()
  const { isSaved, toggleSave } = useApp()

  // GET /trials/:id (api → backend)
  const { data: trial, loading } = useAsync(() => api.getTrial(id), [id])

  const summary = useAiAction(() => api.summariseTrial(id))
  const criteria = useAiAction(() => api.explainCriteria(id))
  const ask = useAiAction((q: string) => api.askTrial(id, q))
  const [question, setQuestion] = useState('')

  if (loading) {
    return (
      <div>
        <Header title="" back />
        <div className="space-y-3 p-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-32 w-full" />
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

  return (
    <div>
      <Header
        title={trial.disease}
        back
        display={false}
        actions={
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
        }
      />

      <div className="space-y-4 px-4 py-4 pb-28">
        {/* Title & meta */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <DiseasePill disease={trial.disease} />
            <StatusBadge status={trial.status} />
          </div>
          <h1 className="font-display text-text mt-3 text-2xl leading-tight font-semibold">
            {trial.title}
          </h1>
          <div className="text-text-muted mt-2 flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="h-3.5 w-3.5" />
              {trial.city}, {trial.country}
            </span>
            <span>{trial.phase}</span>
          </div>
        </div>

        <p className="text-text text-[15px] leading-relaxed">
          {trial.full_description}
        </p>

        {/* AI summary */}
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
              <SummaryRow label="What it’s for" value={summary.data.purpose} />
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

        {/* Eligibility: raw + plain-language */}
        <Card>
          <SectionTitle>Who can take part</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <CriteriaList
              heading="Inclusion criteria"
              items={
                criteria.data ? criteria.data.canJoin : trial.inclusion_criteria
              }
              tone="positive"
            />
            <CriteriaList
              heading="Exclusion criteria"
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
                Couldn’t simplify the criteria right now — the original text is
                shown above.{' '}
                <button
                  className="text-primary underline"
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
                {online ? 'Explain simply' : 'Unavailable offline'}
              </Button>
            )}
            {criteria.data && <DisclaimerNote className="mt-1" />}
          </div>
        </Card>

        {/* Ask about this trial (RAG) */}
        <Card>
          <SectionTitle>Ask about this trial</SectionTitle>
          <p className="text-text-muted -mt-1 mb-3 text-sm">
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
            <p className="text-text-muted mt-2 text-xs">Unavailable offline.</p>
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
                className="text-primary underline"
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
              <DisclaimerNote className="mt-2">{ask.data.note}</DisclaimerNote>
            </div>
          )}
        </Card>

        {/* Centres */}
        {trial.centers.length > 0 && (
          <Card>
            <SectionTitle>Participating centres</SectionTitle>
            <ul className="space-y-2">
              {trial.centers.map((c) => (
                <li key={c.name} className="text-sm">
                  <span className="text-text font-medium">{c.name}</span>
                  <span className="text-text-muted">
                    {' '}
                    — {c.city}, {c.country}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Contact */}
        <Card>
          <SectionTitle>Contact</SectionTitle>
          <div className="space-y-2 text-sm">
            <p className="text-text font-medium">{trial.contact_name}</p>
            <a
              href={`mailto:${trial.contact_email}`}
              className="text-primary inline-flex items-center gap-2"
            >
              <MailIcon className="h-4 w-4" />
              {trial.contact_email}
            </a>
            <a
              href={`tel:${trial.contact_phone.replace(/\s/g, '')}`}
              className="text-primary inline-flex items-center gap-2"
            >
              <PhoneIcon className="h-4 w-4" />
              {trial.contact_phone}
            </a>
          </div>
        </Card>
      </div>

      {/* Sticky action bar */}
      <div className="border-border bg-bg/90 fixed inset-x-0 bottom-16 z-20 border-t px-4 py-3 backdrop-blur-md lg:bottom-0">
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
