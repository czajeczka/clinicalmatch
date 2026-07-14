import { useNavigate } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { CommunityCard } from '@/components/CommunityCard'
import { SkeletonList } from '@/components/Skeleton'
import { ErrorRetry } from '@/components/ErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { UsersIcon } from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/mock/mockApi'

export function Support() {
  const navigate = useNavigate()
  // TODO: connect to API — GET /groups
  const { data, loading, error, reload } = useAsync(() => api.getGroups(), [])

  return (
    <div>
      <Header title="Support" />
      <div className="px-4 pt-3 pb-1">
        <p className="text-text-muted text-sm">
          Disease-specific communities. Join to introduce yourself, ask
          questions, and support others.
        </p>
      </div>
      <div className="px-4 py-4">
        {loading && <SkeletonList count={5} />}
        {!loading && error && (
          <ErrorRetry message="Couldn’t load communities." onRetry={reload} />
        )}
        {!loading && !error && data && data.length === 0 && (
          <EmptyState
            icon={<UsersIcon className="h-8 w-8" />}
            title="No communities yet"
            body="Check back soon."
          />
        )}
        {!loading && !error && data && data.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.map((group) => (
              <CommunityCard
                key={group.id}
                group={group}
                onOpen={(g) => navigate(`/support/${g.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
