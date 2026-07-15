import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Card, SectionTitle } from '@/components/Card'
import { TrialCard } from '@/components/TrialCard'
import { Chip } from '@/components/Chip'
import { Button } from '@/components/Button'
import { Input } from '@/components/Field'
import { BottomSheet } from '@/components/BottomSheet'
import { SegmentedControl } from '@/components/SegmentedControl'
import { EmptyState } from '@/components/EmptyState'
import { HeartIcon, UsersIcon } from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'
import { DISEASES, type Disease } from '@/lib/diseases'

const inlineBtn =
  'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]'

export function Profile() {
  const navigate = useNavigate()
  const { user, setUser, savedTrialIds, joinedGroupIds, toggleJoin, toast } =
    useApp()
  const [theme, setTheme] = useTheme()
  const [editOpen, setEditOpen] = useState(false)

  // Dedicated endpoints (not the whole catalogue); refetch when the counts
  // change so leaving a community / un-saving reflects immediately.
  const { data: savedData } = useAsync(
    () => api.getSavedTrials(),
    [savedTrialIds.length]
  )
  const { data: joinedData } = useAsync(
    () => api.getMemberships(),
    [joinedGroupIds.length]
  )
  const saved = savedData ?? []
  const joined = joinedData ?? []

  function toggleInterest(d: Disease) {
    if (!user) return
    const next = user.interests.includes(d)
      ? user.interests.filter((x) => x !== d)
      : [...user.interests, d]
    setUser({ ...user, interests: next }) // setUser persists to localStorage
    // Keep interest-based matching in sync on the backend.
    void api.patchUser(user.id, { interests: next }).catch(() => {})
  }

  return (
    <div>
      <Header title="Profile" />
      <div className="space-y-6 px-4 py-4">
        {/* Identity + stats */}
        <Card className="flex items-center gap-4">
          <div className="bg-secondary/15 text-secondary font-display grid h-14 w-14 place-items-center rounded-full text-xl font-semibold">
            {(user?.display_name ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-text truncate text-lg font-semibold">
              {user?.display_name}
            </p>
            <p className="text-text-muted truncate text-sm">
              {[user?.city, user?.age ? `${user.age}` : null]
                .filter(Boolean)
                .join(' · ') || 'Tap Edit to add your details'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditOpen(true)}
            aria-haspopup="dialog"
          >
            Edit
          </Button>
        </Card>

        <Card className="flex justify-around">
          <Stat label="Saved" value={savedTrialIds.length} />
          <Stat label="Groups" value={joinedGroupIds.length} />
        </Card>

        {/* Saved trials */}
        <section>
          <SectionTitle>Saved trials</SectionTitle>
          {saved.length === 0 ? (
            <EmptyState
              icon={<HeartIcon className="h-8 w-8" />}
              title="No saved trials yet"
              body="Save a trial to keep it here — available offline."
              actionLabel="Browse trials"
              onAction={() => navigate('/trials')}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {saved.map((t) => (
                <TrialCard
                  key={t.id}
                  trial={t}
                  onOpen={(tr) => navigate(`/trials/${tr.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Joined communities */}
        <section>
          <SectionTitle>Your communities</SectionTitle>
          {joined.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-8 w-8" />}
              title="You haven’t joined any communities"
              actionLabel="Explore communities"
              onAction={() => navigate('/support')}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {joined.map((g) => (
                <Card
                  key={g.id}
                  interactive
                  onClick={() => navigate(`/support/${g.id}`)}
                  className="flex items-center justify-between"
                >
                  <span className="text-text font-medium">{g.name}</span>
                  <button
                    className={`text-text-muted hover:text-text px-2 py-1 text-sm ${inlineBtn}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleJoin(g.id, g.name)
                    }}
                  >
                    Leave
                  </button>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Settings */}
        <section>
          <SectionTitle>Settings</SectionTitle>
          <Card className="space-y-5">
            <div>
              <p className="text-text mb-2 text-sm font-medium">Interests</p>
              <div className="flex flex-wrap gap-2">
                {DISEASES.map((d) => (
                  <Chip
                    key={d}
                    selected={user?.interests.includes(d)}
                    onClick={() => toggleInterest(d)}
                  >
                    {d}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-text mb-2 text-sm font-medium">Appearance</p>
              <SegmentedControl<Theme>
                ariaLabel="Theme"
                value={theme}
                onChange={setTheme}
                segments={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>
            <div className="text-text-muted text-xs">
              Signed in on this device only. Clearing browser data starts a new
              identity (no account recovery in this version).
              <button
                className={`text-primary ml-1 underline ${inlineBtn}`}
                onClick={() =>
                  toast('This is a demo setting — no email is sent.', 'info')
                }
              >
                Notification settings
              </button>
            </div>
          </Card>
        </section>
      </div>

      {user && editOpen && (
        <EditProfileSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          user={user}
          onSave={(patch) => {
            setUser({ ...user, ...patch })
            void api
              .patchUser(user.id, {
                display_name: patch.display_name,
                age: patch.age ?? null,
                city: patch.city ?? null,
              })
              .catch(() => {})
            toast('Profile updated', 'success')
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}

function EditProfileSheet({
  open,
  onClose,
  user,
  onSave,
}: {
  open: boolean
  onClose: () => void
  user: { display_name: string; age?: number; city?: string }
  onSave: (patch: { display_name: string; age?: number; city?: string }) => void
}) {
  const [name, setName] = useState(user.display_name)
  const [age, setAge] = useState(user.age ? String(user.age) : '')
  const [city, setCity] = useState(user.city ?? '')

  const nameValid = name.trim().length > 0
  const ageValid =
    age.trim() === '' ||
    (Number.isInteger(Number(age)) && Number(age) > 0 && Number(age) < 130)
  const canSave = nameValid && ageValid

  if (!open) return null
  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile">
      <div className="space-y-4">
        <Input
          label="Display name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!nameValid ? 'A display name is required.' : undefined}
        />
        <Input
          label="Age"
          type="number"
          inputMode="numeric"
          min={1}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Optional"
          error={!ageValid ? 'Enter a whole number.' : undefined}
        />
        <Input
          label="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Optional"
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canSave}
            onClick={() =>
              onSave({
                display_name: name.trim(),
                age: age.trim() === '' ? undefined : Number(age),
                city: city.trim() || undefined,
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-display text-text text-xl font-semibold">{value}</p>
      <p className="text-text-muted font-mono text-xs uppercase">{label}</p>
    </div>
  )
}
