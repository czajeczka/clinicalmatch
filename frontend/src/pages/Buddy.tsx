import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Select } from '@/components/Field'
import { Input } from '@/components/Field'
import { MemberCard } from '@/components/MemberCard'
import { MemberProfileSheet } from '@/components/MemberProfileSheet'
import { SafetyNotice } from '@/components/SafetyNotice'
import { EmptyState } from '@/components/EmptyState'
import { Card } from '@/components/Card'
import { UsersIcon } from '@/components/icons'
import { useApp } from '@/store/store'
import { DISEASES } from '@/lib/diseases'
import {
  findBuddies,
  sendBuddyRequest,
  isBuddyRequested,
  membersForDisease,
  TREATMENT_STAGES,
  LANGUAGES,
  type Member,
} from '@/lib/community'

/**
 * Buddy Finder: match with someone in a similar situation — same disease,
 * similar age, same country, language or treatment stage — and send a buddy
 * request. Members and requests are the local community layer for now.
 */
export function Buddy() {
  const [params] = useSearchParams()
  const { user, toast } = useApp()
  const [profile, setProfile] = useState<Member | null>(null)
  const [requested, setRequested] = useState<string[]>([])

  const interestDiseases = user?.interests?.length
    ? user.interests
    : [...DISEASES]

  const [disease, setDisease] = useState(params.get('disease') ?? '')
  const [country, setCountry] = useState('')
  const [language, setLanguage] = useState('')
  const [stage, setStage] = useState('')
  const [age, setAge] = useState('')

  // Countries available in the candidate pool (data-driven select options).
  const countries = useMemo(() => {
    const pool = interestDiseases.flatMap((d) => membersForDisease(d))
    return [...new Set(pool.map((m) => m.country))].sort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestDiseases.join('|')])

  const ageNum = age ? Number(age) : undefined
  const results = useMemo(
    () =>
      findBuddies(interestDiseases, {
        disease: disease || undefined,
        country: country || undefined,
        language: language || undefined,
        stage: stage || undefined,
        age: ageNum && Number.isFinite(ageNum) ? ageNum : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interestDiseases.join('|'), disease, country, language, stage, age]
  )

  function request(m: Member) {
    sendBuddyRequest(m.id)
    setRequested((prev) => (prev.includes(m.id) ? prev : [...prev, m.id]))
    toast(`Buddy request sent to ${m.nickname}`, 'success')
  }

  return (
    <div>
      <Header title="Find a buddy" back display={false} />
      <div className="animate-fade-in space-y-5 px-4 py-4">
        <p className="text-text-muted text-sm">
          Connect one-to-one with someone who understands. Filter by what
          matters to you, then send a buddy request.
        </p>
        <SafetyNotice />

        {/* Filters */}
        <Card className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Condition"
            value={disease}
            onChange={(e) => setDisease(e.target.value)}
          >
            <option value="">Any of mine</option>
            {interestDiseases.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <Select
            label="Treatment stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="">Any stage</option>
            {TREATMENT_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">Any country</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="">Any language</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
          <Input
            label="Similar age (±6 years)"
            type="number"
            inputMode="numeric"
            min={18}
            max={99}
            placeholder="e.g. 45"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-text text-lg font-semibold">
            {results.length} {results.length === 1 ? 'match' : 'matches'}
          </h2>
        </div>

        {results.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-8 w-8" />}
            title="No buddies match yet"
            body="Try widening your filters — for example any country or a wider age range."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {results.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onView={setProfile}
                onRequest={request}
                requested={requested.includes(m.id) || isBuddyRequested(m.id)}
              />
            ))}
          </div>
        )}
      </div>

      <MemberProfileSheet
        member={profile}
        open={profile !== null}
        onClose={() => setProfile(null)}
      />
    </div>
  )
}
