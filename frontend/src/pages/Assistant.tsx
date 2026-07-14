import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input, Select } from '@/components/Field'
import { SegmentedControl } from '@/components/SegmentedControl'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { DisclaimerNote } from '@/components/DisclaimerNote'
import { CheckIcon, CloseIcon } from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { useAiAction } from '@/hooks/useAiAction'
import { useOnline } from '@/hooks/useOnline'
import { api } from '@/mock/mockApi'
import type { Gender } from '@/types'

type Tool = 'check' | 'ask'

export function Assistant() {
  const location = useLocation()
  const preselectTrial = (location.state as { trialId?: string } | null)
    ?.trialId
  const online = useOnline()

  const [tool, setTool] = useState<Tool>('check')
  // TODO: connect to API — GET /trials (for the selector)
  const { data: trials } = useAsync(() => api.getTrials(), [])

  return (
    <div>
      <Header title="AI Assistant" />
      <div className="px-4 pt-4">
        <SegmentedControl
          ariaLabel="Assistant tools"
          value={tool}
          onChange={setTool}
          segments={[
            { value: 'check', label: 'Eligibility check' },
            { value: 'ask', label: 'Ask about a trial' },
          ]}
        />
      </div>

      <div className="px-4 py-4">
        {tool === 'check' ? (
          <SelfCheck
            trials={trials ?? []}
            preselectTrial={preselectTrial}
            online={online}
          />
        ) : (
          <AskTrial
            trials={trials ?? []}
            preselectTrial={preselectTrial}
            online={online}
          />
        )}
      </div>
    </div>
  )
}

interface ToolProps {
  trials: { id: string; title: string }[]
  preselectTrial?: string
  online: boolean
}

function SelfCheck({ trials, preselectTrial, online }: ToolProps) {
  const [trialId, setTrialId] = useState(preselectTrial ?? '')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [condition, setCondition] = useState('')
  const [treatment, setTreatment] = useState('')
  const check = useAiAction(api.selfCheck)

  const ageNum = Number(age)
  const missing: string[] = []
  if (!trialId) missing.push('a trial')
  if (!age || !Number.isFinite(ageNum) || ageNum <= 0) missing.push('age')
  if (!gender) missing.push('gender')
  if (!condition.trim()) missing.push('condition')
  const canRun = missing.length === 0 && online

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <Select
          label="Trial"
          required
          value={trialId}
          onChange={(e) => setTrialId(e.target.value)}
        >
          <option value="">Choose a trial…</option>
          {trials.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Age"
            required
            type="number"
            inputMode="numeric"
            min={0}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
          <Select
            label="Gender"
            required
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
          >
            <option value="">Select…</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer not to say">Prefer not to say</option>
          </Select>
        </div>
        <Input
          label="Diagnosed condition"
          required
          placeholder="e.g. Type 2 Diabetes"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        />
        <Input
          label="Current treatment"
          placeholder="Optional"
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
        />

        {!canRun && (
          <p className="text-text-muted text-sm">
            {online
              ? `Add ${missing.join(', ')} to run the check.`
              : 'The self-check is unavailable offline.'}
          </p>
        )}

        <Button
          fullWidth
          disabled={!canRun}
          loading={check.loading}
          loadingLabel="Checking protocol…"
          onClick={() =>
            check.run({
              trial_id: trialId,
              age: ageNum,
              gender: gender as Gender,
              condition,
              treatment: treatment || undefined,
            })
          }
        >
          Run check
        </Button>
      </Card>

      {check.error && (
        <Card>
          <p className="text-text text-sm">
            The assistant couldn’t complete this right now. Please try again in
            a moment.
          </p>
        </Card>
      )}

      {check.data && !check.loading && (
        <Card className="space-y-4" aria-live="polite">
          <ConfidenceMeter verdict={check.data.verdict} />
          <p className="text-text font-medium">{check.data.headline}</p>
          {check.data.matches.length > 0 && (
            <ResultList
              heading="What matched"
              items={check.data.matches}
              tone="positive"
            />
          )}
          {check.data.gaps.length > 0 && (
            <ResultList
              heading="What to confirm"
              items={check.data.gaps}
              tone="neutral"
            />
          )}
          <DisclaimerNote>{check.data.note}</DisclaimerNote>
        </Card>
      )}
    </div>
  )
}

function AskTrial({ trials, preselectTrial, online }: ToolProps) {
  const [trialId, setTrialId] = useState(preselectTrial ?? '')
  const [question, setQuestion] = useState('')
  const ask = useAiAction((id: string, q: string) => api.askTrial(id, q))
  const canAsk = !!trialId && !!question.trim() && online

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <Select
          label="Trial"
          required
          value={trialId}
          onChange={(e) => setTrialId(e.target.value)}
        >
          <option value="">Choose a trial…</option>
          {trials.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </Select>
        <Input
          label="Your question"
          placeholder="e.g. Can I join if I have hypertension?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button
          fullWidth
          disabled={!canAsk}
          loading={ask.loading}
          loadingLabel="Reading the study…"
          onClick={() => ask.run(trialId, question.trim())}
        >
          Ask
        </Button>
        {!online && (
          <p className="text-text-muted text-sm">Unavailable offline.</p>
        )}
      </Card>

      {ask.error && (
        <Card>
          <p className="text-text text-sm">
            The assistant couldn’t answer right now. Please try again in a
            moment.
          </p>
        </Card>
      )}

      {ask.data && !ask.loading && (
        <Card className="space-y-2" aria-live="polite">
          <p className="text-text text-sm">{ask.data.answer}</p>
          <p className="text-text-muted font-mono text-xs">
            Source: {ask.data.citedSection}
          </p>
          <DisclaimerNote>{ask.data.note}</DisclaimerNote>
        </Card>
      )}
    </div>
  )
}

function ResultList({
  heading,
  items,
  tone,
}: {
  heading: string
  items: string[]
  tone: 'positive' | 'neutral'
}) {
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
