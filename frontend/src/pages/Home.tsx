import { useNavigate } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Card, SectionTitle } from '@/components/Card'
import { TrialCard } from '@/components/TrialCard'
import { IconButton } from '@/components/IconButton'
import { SkeletonCard } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { BellIcon, SearchIcon, SparkIcon, UsersIcon } from '@/components/icons'
import { timeAgo } from '@/lib/format'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'
import type { Trial } from '@/types'

export function Home() {
  const navigate = useNavigate()
  const { user } = useApp()
  const interests = user?.interests ?? []

  // TODO: connect to API — GET /trials (then match against interests)
  const { data: trials, loading } = useAsync(() => api.getTrials(), [])
  // TODO: connect to API — GET /notifications
  const { data: notifications } = useAsync(() => api.getNotifications(), [])

  const matching: Trial[] = (trials ?? []).filter(
    (t) => interests.length === 0 || interests.includes(t.disease)
  )

  return (
    <div>
      <Header
        title={`Hello, ${user?.display_name ?? 'there'}`}
        actions={
          <IconButton
            label="Notifications"
            onClick={() => navigate('/profile')}
          >
            <BellIcon className="h-5 w-5" />
          </IconButton>
        }
      />

      <div className="space-y-6 px-4 py-4">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            icon={<SearchIcon className="h-5 w-5" />}
            label="Find trials"
            onClick={() => navigate('/trials')}
          />
          <QuickAction
            icon={<SparkIcon className="h-5 w-5" />}
            label="Self-check"
            onClick={() => navigate('/assistant')}
          />
          <QuickAction
            icon={<UsersIcon className="h-5 w-5" />}
            label="Communities"
            onClick={() => navigate('/support')}
          />
        </div>

        {/* Matching trials */}
        <section>
          <SectionTitle>
            {interests.length > 0
              ? 'Trials matching your interests'
              : 'Trials you might explore'}
          </SectionTitle>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : matching.length === 0 ? (
            <EmptyState
              title="No matches yet"
              body="Set your interests in your profile to see tailored trials."
              actionLabel="Set interests"
              onAction={() => navigate('/profile')}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {matching.slice(0, 4).map((t) => (
                <TrialCard
                  key={t.id}
                  trial={t}
                  onOpen={(tr) => navigate(`/trials/${tr.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Notifications */}
        <section>
          <SectionTitle>Recent</SectionTitle>
          {notifications && notifications.length > 0 ? (
            <div className="flex flex-col gap-2">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  interactive={!!n.trial_id}
                  onClick={
                    n.trial_id
                      ? () => navigate(`/trials/${n.trial_id}`)
                      : undefined
                  }
                  className="flex items-start gap-3"
                >
                  <span
                    className={
                      'mt-1 h-2 w-2 shrink-0 rounded-full ' +
                      (n.read ? 'bg-transparent' : 'bg-accent')
                    }
                    aria-hidden
                  />
                  <div>
                    <p className="text-text text-sm font-medium">{n.title}</p>
                    <p className="text-text-muted text-sm">{n.body}</p>
                    <p className="text-text-muted mt-1 font-mono text-xs">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">Nothing new right now.</p>
          )}
        </section>
      </div>
    </div>
  )
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border bg-surface text-text flex flex-col items-center gap-2 rounded-[var(--radius-card)] border p-4 text-sm font-medium shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-pop)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </button>
  )
}
