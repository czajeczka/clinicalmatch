import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { DiscussionCard } from '@/components/DiscussionCard'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonList } from '@/components/Skeleton'
import { Button } from '@/components/Button'
import { ComposeSheet } from '@/components/ComposeSheet'
import { PlusIcon, UsersIcon } from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'

export function Board() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const { discussionsForGroup, isJoined, toggleJoin } = useApp()
  const [composeOpen, setComposeOpen] = useState(false)

  // TODO: connect to API — GET /groups/:id
  const { data: groups, loading } = useAsync(() => api.getGroups(), [])
  const group = groups?.find((g) => g.id === groupId)
  const discussions = discussionsForGroup(groupId)
  const joined = group ? isJoined(group.id) : false

  if (loading) {
    return (
      <div>
        <Header title="" back />
        <div className="p-4">
          <SkeletonList count={4} />
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div>
        <Header title="Community" back />
        <EmptyState
          title="Community not found"
          actionLabel="Back to Support"
          onAction={() => navigate('/support')}
        />
      </div>
    )
  }

  function startDiscussion() {
    if (!joined) {
      toggleJoin(group!.id, group!.name)
    }
    setComposeOpen(true)
  }

  return (
    <div>
      <Header
        title={group.name}
        back
        display={false}
        actions={
          <Button
            variant={joined ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => toggleJoin(group.id, group.name)}
          >
            {joined ? 'Joined' : 'Join'}
          </Button>
        }
      />
      <div className="px-4 pt-3">
        <p className="text-text-muted text-sm">{group.description}</p>
      </div>

      <div className="px-4 py-4">
        {discussions.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-8 w-8" />}
            title="No discussions yet"
            body="Be the first to introduce yourself or ask a question."
            actionLabel="Start a discussion"
            onAction={startDiscussion}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {discussions.map((d) => (
              <DiscussionCard
                key={d.id}
                discussion={d}
                onOpen={(disc) => navigate(`/discussion/${disc.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating compose button */}
      <button
        type="button"
        onClick={startDiscussion}
        aria-label="Start a discussion"
        className="bg-accent hover:bg-accent-hover fixed right-4 bottom-20 z-20 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[var(--shadow-pop)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] lg:bottom-6"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      <ComposeSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        groupId={group.id}
        groupName={group.name}
      />
    </div>
  )
}
