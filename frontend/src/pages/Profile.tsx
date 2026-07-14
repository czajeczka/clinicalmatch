import { useNavigate } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Card, SectionTitle } from '@/components/Card'
import { TrialCard } from '@/components/TrialCard'
import { Chip } from '@/components/Chip'
import { SegmentedControl } from '@/components/SegmentedControl'
import { EmptyState } from '@/components/EmptyState'
import { HeartIcon, UsersIcon } from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'
import { saveUser } from '@/lib/identity'
import { DISEASES, type Disease } from '@/lib/diseases'

export function Profile() {
  const navigate = useNavigate()
  const { user, setUser, savedTrialIds, joinedGroupIds, toggleJoin, toast } =
    useApp()
  const [theme, setTheme] = useTheme()

  const { data: trials } = useAsync(() => api.getTrials(), [])
  const { data: groups } = useAsync(() => api.getGroups(), [])

  const saved = (trials ?? []).filter((t) => savedTrialIds.includes(t.id))
  const joined = (groups ?? []).filter((g) => joinedGroupIds.includes(g.id))

  function toggleInterest(d: Disease) {
    if (!user) return
    const next = user.interests.includes(d)
      ? user.interests.filter((x) => x !== d)
      : [...user.interests, d]
    const updated = { ...user, interests: next }
    saveUser(updated)
    setUser(updated)
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
          <div className="flex-1">
            <p className="font-display text-text text-lg font-semibold">
              {user?.display_name}
            </p>
            {user?.city && (
              <p className="text-text-muted text-sm">{user.city}</p>
            )}
          </div>
          <div className="flex gap-4 text-center">
            <Stat label="Saved" value={savedTrialIds.length} />
            <Stat label="Groups" value={joinedGroupIds.length} />
          </div>
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
                    className="text-text-muted text-sm"
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
                className="text-primary ml-1 underline"
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
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-text text-xl font-semibold">{value}</p>
      <p className="text-text-muted font-mono text-xs uppercase">{label}</p>
    </div>
  )
}
