import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { DiscussionCard } from '@/components/DiscussionCard'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonList } from '@/components/Skeleton'
import { ErrorRetry } from '@/components/ErrorRetry'
import { Button } from '@/components/Button'
import { ComposeSheet } from '@/components/ComposeSheet'
import { PlusIcon, UsersIcon } from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'

export function Board() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const { isJoined, toggleJoin } = useApp()
  const [composeOpen, setComposeOpen] = useState(false)

  // Groups (find one) + the group's discussions board (api → backend).
  const { data: groups, loading: groupsLoading } = useAsync(
    () => api.getGroups(),
    []
  )
  const {
    data: discussions,
    loading,
    error,
    reload,
  } = useAsync(() => api.getGroupDiscussions(groupId), [groupId])

  const group = groups?.find((g) => g.id === groupId)
  const joined = group ? isJoined(group.id) : false

  if (groupsLoading) {
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

  // Open the composer without side effects; joining happens on publish so a
  // user who cancels isn't silently enrolled in the community.
  function startDiscussion() {
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
        {loading && <SkeletonList count={4} />}
        {!loading && error && (
          <ErrorRetry message="Couldn’t load this board." onRetry={reload} />
        )}
        {!loading && !error && discussions && discussions.length === 0 && (
          <EmptyState
            icon={<UsersIcon className="h-8 w-8" />}
            title="No discussions yet"
            body="Be the first to introduce yourself or ask a question."
            actionLabel="Start a discussion"
            onAction={startDiscussion}
          />
        )}
        {!loading && !error && discussions && discussions.length > 0 && (
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
        className="bg-accent hover:bg-accent-hover fixed right-4 bottom-20 z-20 flex h-14 w-14 items-center justify-center rounded-full text-[var(--color-on-accent)] shadow-[var(--shadow-pop)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] lg:bottom-6"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      <ComposeSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        groupId={group.id}
        groupName={group.name}
        onPublished={() => {
          // Publishing your first post also joins the community.
          if (!joined) toggleJoin(group.id, group.name)
          reload()
        }}
      />
    </div>
  )
}
