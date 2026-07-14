import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Input } from '@/components/Field'
import { Chip } from '@/components/Chip'
import { LogoMark } from '@/components/icons'
import { DISEASES, type Disease } from '@/lib/diseases'
import { createUser } from '@/lib/identity'
import { useApp } from '@/store/store'
import { api } from '@/mock/mockApi'

/**
 * First-run flow. Creates a device-based anonymous identity (no login).
 * Two light steps: who you are, then what you care about.
 */
export function Onboarding() {
  const navigate = useNavigate()
  const { setUser } = useApp()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')
  const [interests, setInterests] = useState<Disease[]>([])

  const ageNum = age ? Number(age) : undefined
  const nameValid = name.trim().length > 0

  function finish(withInterests: Disease[]) {
    const user = createUser({
      display_name: name,
      age: Number.isFinite(ageNum) ? ageNum : undefined,
      city,
      interests: withInterests,
    })
    setUser(user)
    // Persist the device identity to the backend so posts resolve author_name.
    // Fire-and-forget: onboarding shouldn't block on the network.
    void api
      .upsertUser({
        id: user.id,
        display_name: user.display_name,
        age: user.age,
        city: user.city,
        interests: user.interests,
      })
      .catch(() => {})
    navigate('/', { replace: true })
  }

  function toggleInterest(d: Disease) {
    setInterests((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-5 py-10">
      <div className="mb-8 flex items-center gap-2">
        <LogoMark className="h-8 w-8" />
        <span className="font-display text-primary text-xl font-semibold">
          ClinicalMatch
        </span>
      </div>

      {/* progress */}
      <div className="mb-6 flex gap-1.5" aria-hidden>
        {[0, 1].map((i) => (
          <span
            key={i}
            className={
              'h-1.5 flex-1 rounded-full ' +
              (i <= step ? 'bg-accent' : 'bg-text/10')
            }
          />
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-1 flex-col">
          <h1 className="font-display text-text text-2xl font-semibold">
            Welcome
          </h1>
          <p className="text-text-muted mt-1 mb-6 text-sm">
            A little about you. No account, no password — this stays on your
            device.
          </p>
          <div className="flex flex-col gap-4">
            <Input
              label="Display name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
            />
            <Input
              label="Age"
              type="number"
              inputMode="numeric"
              min={0}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Optional"
            />
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="mt-auto pt-8">
            <Button fullWidth disabled={!nameValid} onClick={() => setStep(1)}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-1 flex-col">
          <h1 className="font-display text-text text-2xl font-semibold">
            What matters to you?
          </h1>
          <p className="text-text-muted mt-1 mb-6 text-sm">
            Pick any conditions you’d like to follow. We’ll tailor what you see.
          </p>
          <div className="flex flex-wrap gap-2">
            {DISEASES.map((d) => (
              <Chip
                key={d}
                selected={interests.includes(d)}
                onClick={() => toggleInterest(d)}
              >
                {d}
              </Chip>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-8">
            <Button fullWidth onClick={() => finish(interests)}>
              Get started
            </Button>
            <Button variant="ghost" fullWidth onClick={() => finish([])}>
              Skip for now
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
