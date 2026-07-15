import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { PostCard } from '@/components/PostCard'
import { MemberCard } from '@/components/MemberCard'
import { MemberProfileSheet } from '@/components/MemberProfileSheet'
import { MeetupCard } from '@/components/MeetupCard'
import { CommunityCover } from '@/components/CommunityCover'
import { SafetyNotice } from '@/components/SafetyNotice'
import { ReportDialog } from '@/components/ReportDialog'
import { ComposeSheet } from '@/components/ComposeSheet'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonList } from '@/components/Skeleton'
import { ErrorRetry } from '@/components/ErrorRetry'
import {
  PlusIcon,
  SearchIcon,
  UsersIcon,
  TrendingIcon,
  CalendarIcon,
  ShieldIcon,
} from '@/components/icons'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'
import {
  communityMeta,
  membersForDisease,
  meetupsForDisease,
  getReactionState,
  COMMUNITY_TAGS,
  type Member,
  type ReportTarget,
} from '@/lib/community'
import type { Discussion } from '@/types'

function score(d: Discussion): number {
  const r = getReactionState(d.id)
  const reactions = Object.values(r.counts).reduce((a, b) => a + b, 0)
  return d.reply_count * 3 + reactions
}

export function Board() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const { isJoined, toggleJoin } = useApp()
  const [composeOpen, setComposeOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTarget
    id: string
  } | null>(null)
  const [profile, setProfile] = useState<Member | null>(null)

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

  const members = useMemo(
    () => (group ? membersForDisease(group.disease) : []),
    [group]
  )
  const meetups = useMemo(
    () => (group ? meetupsForDisease(group.disease) : []),
    [group]
  )

  const all = discussions ?? []
  const pinned = all.length > 0 ? [...all].sort(byOldest)[0] : null
  const trending = useMemo(() => {
    const list = discussions ?? []
    return [...list]
      .sort((a, b) => score(b) - score(a))
      .filter((d) => score(d) > 0)
      .slice(0, 3)
  }, [discussions])

  const q = query.trim().toLowerCase()
  const searching = q.length > 0
  const matchedDiscussions = all.filter(
    (d) =>
      d.title?.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
  )
  const matchedMembers = members.filter(
    (m) =>
      m.nickname.toLowerCase().includes(q) ||
      m.country.toLowerCase().includes(q) ||
      m.stage.toLowerCase().includes(q) ||
      m.language.toLowerCase().includes(q)
  )
  const matchedTags = COMMUNITY_TAGS.filter((t) => t.toLowerCase().includes(q))

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
          actionLabel="Back to Communities"
          onAction={() => navigate('/support')}
        />
      </div>
    )
  }

  const joined = isJoined(group.id)
  const meta = communityMeta(group)
  const openPost = (d: Discussion) => navigate(`/discussion/${d.id}`)

  return (
    <div>
      <Header title={group.name} back display={false} heading={false} />

      <div className="animate-fade-in space-y-5 px-4 py-4">
        {/* Cover header */}
        <CommunityCover
          group={group}
          className="rounded-[var(--radius-card)] p-4 sm:p-5"
        >
          <div className="relative flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              <span
                className="bg-success h-1.5 w-1.5 rounded-full"
                aria-hidden
              />
              {meta.onlineCount} online now
            </span>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-xl leading-tight font-semibold text-white drop-shadow-sm sm:text-2xl">
                  {group.name}
                </h1>
                <p className="mt-1 font-mono text-xs text-white/85">
                  {group.member_count.toLocaleString()} members
                </p>
              </div>
              <Button
                variant={joined ? 'secondary' : 'primary'}
                size="sm"
                className={
                  joined
                    ? 'border-white/70 !bg-white/15 text-white backdrop-blur hover:!bg-white/25'
                    : ''
                }
                onClick={() => toggleJoin(group.id, group.name)}
              >
                {joined ? 'Joined' : 'Join community'}
              </Button>
            </div>
          </div>
        </CommunityCover>

        <p className="text-text-muted text-sm">{group.description}</p>

        {/* Moderators */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {meta.moderators.map((m) => (
              <Avatar
                key={m.name}
                initials={m.initials}
                size="sm"
                className="ring-surface rounded-full ring-2"
                title={m.name}
              />
            ))}
          </div>
          <span className="text-text-muted text-xs">
            Moderated by {meta.moderators.map((m) => m.name).join(', ')}
          </span>
        </div>

        <SafetyNotice />

        {/* Toolbar: create + search */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={() => setComposeOpen(true)} className="shrink-0">
            <PlusIcon className="h-4 w-4" />
            Create post
          </Button>
          <div className="border-border bg-surface focus-within:border-primary/50 focus-within:ring-primary/15 relative flex flex-1 items-center rounded-full border transition-colors focus-within:ring-2">
            <SearchIcon className="text-text-muted pointer-events-none absolute left-3.5 h-[18px] w-[18px]" />
            <input
              type="search"
              aria-label="Search discussions, members and tags"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, members, tags…"
              className="text-text placeholder:text-text-muted h-11 w-full rounded-full bg-transparent pr-4 pl-11 text-sm outline-none"
            />
          </div>
        </div>

        {searching ? (
          <SearchResults
            query={query}
            tags={matchedTags}
            discussions={matchedDiscussions}
            members={matchedMembers}
            onTag={(t) => setQuery(t)}
            onOpenPost={openPost}
            onReport={(d) => setReportTarget({ type: 'post', id: d.id })}
            onViewMember={setProfile}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
            {/* Feed */}
            <div className="min-w-0 space-y-4">
              {loading && <SkeletonList count={4} />}
              {!loading && error && (
                <ErrorRetry
                  message="Couldn’t load this board."
                  onRetry={reload}
                />
              )}
              {!loading && !error && all.length === 0 && (
                <EmptyState
                  icon={<UsersIcon className="h-8 w-8" />}
                  title="No discussions yet"
                  body="Be the first to introduce yourself or ask a question."
                  actionLabel="Create post"
                  onAction={() => setComposeOpen(true)}
                />
              )}
              {!loading && !error && all.length > 0 && (
                <>
                  {pinned && (
                    <PostCard
                      discussion={pinned}
                      pinned
                      onOpen={openPost}
                      onReport={(d) =>
                        setReportTarget({ type: 'post', id: d.id })
                      }
                    />
                  )}
                  <h2 className="text-text-muted px-1 font-mono text-xs uppercase">
                    Latest discussions
                  </h2>
                  <div className="flex flex-col gap-4">
                    {all
                      .filter((d) => d.id !== pinned?.id)
                      .map((d) => (
                        <PostCard
                          key={d.id}
                          discussion={d}
                          onOpen={openPost}
                          onReport={(disc) =>
                            setReportTarget({ type: 'post', id: disc.id })
                          }
                        />
                      ))}
                  </div>
                </>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5">
              {trending.length > 0 && (
                <SidebarCard
                  icon={<TrendingIcon className="h-4 w-4" />}
                  title="Trending"
                >
                  <ul className="space-y-2.5">
                    {trending.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => openPost(d)}
                          className="text-text hover:text-primary block w-full text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                        >
                          <span className="line-clamp-1">
                            {d.title || d.content.slice(0, 60)}
                          </span>
                          <span className="text-text-muted font-mono text-xs">
                            {d.reply_count}{' '}
                            {d.reply_count === 1 ? 'reply' : 'replies'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </SidebarCard>
              )}

              <SidebarCard
                icon={<CalendarIcon className="h-4 w-4" />}
                title="Upcoming meetups"
              >
                <div className="space-y-2.5">
                  {meetups.slice(0, 2).map((m) => (
                    <MeetupCard key={m.id} meetup={m} />
                  ))}
                </div>
              </SidebarCard>

              <SidebarCard
                icon={<UsersIcon className="h-4 w-4" />}
                title="Members"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {members.slice(0, 5).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setProfile(m)}
                        aria-label={`View ${m.nickname}`}
                        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                      >
                        <Avatar
                          initials={m.initials}
                          color={m.color}
                          size="sm"
                          className="ring-surface rounded-full ring-2"
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-text-muted text-xs">
                    {meta.onlineCount} online
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() =>
                    navigate(
                      `/support/buddies?disease=${encodeURIComponent(group.disease)}`
                    )
                  }
                >
                  Find a buddy
                </Button>
              </SidebarCard>

              <SidebarCard
                icon={<ShieldIcon className="h-4 w-4" />}
                title="Community rules"
              >
                <ol className="space-y-2">
                  {meta.guidelines.map((g, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary font-mono text-xs font-semibold">
                        {i + 1}.
                      </span>
                      <span className="text-text-muted leading-snug">{g}</span>
                    </li>
                  ))}
                </ol>
              </SidebarCard>
            </aside>
          </div>
        )}
      </div>

      {/* Floating compose button (mobile-friendly) */}
      <button
        type="button"
        onClick={() => setComposeOpen(true)}
        aria-label="Create post"
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
          if (!joined) toggleJoin(group.id, group.name)
          reload()
        }}
      />

      <ReportDialog
        open={reportTarget !== null}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
      />

      <MemberProfileSheet
        member={profile}
        open={profile !== null}
        onClose={() => setProfile(null)}
      />
    </div>
  )
}

function byOldest(a: Discussion, b: Discussion): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

function SidebarCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="space-y-3">
      <h2 className="text-text flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </Card>
  )
}

function SearchResults({
  query,
  tags,
  discussions,
  members,
  onTag,
  onOpenPost,
  onReport,
  onViewMember,
}: {
  query: string
  tags: readonly string[]
  discussions: Discussion[]
  members: Member[]
  onTag: (t: string) => void
  onOpenPost: (d: Discussion) => void
  onReport: (d: Discussion) => void
  onViewMember: (m: Member) => void
}) {
  const empty =
    tags.length === 0 && discussions.length === 0 && members.length === 0
  return (
    <div className="space-y-5">
      <p className="text-text-muted text-sm">
        Results for <span className="text-text font-medium">“{query}”</span>
      </p>

      {empty && (
        <EmptyState
          icon={<SearchIcon className="h-8 w-8" />}
          title="No matches"
          body="Try a different word, a tag, a member name or a country."
        />
      )}

      {tags.length > 0 && (
        <section>
          <h2 className="text-text-muted mb-2 font-mono text-xs uppercase">
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTag(t)}
                className="bg-secondary/12 text-secondary hover:bg-secondary/20 inline-flex items-center rounded-full px-3 py-1 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                #{t}
              </button>
            ))}
          </div>
        </section>
      )}

      {discussions.length > 0 && (
        <section>
          <h2 className="text-text-muted mb-2 font-mono text-xs uppercase">
            Discussions
          </h2>
          <div className="flex flex-col gap-4">
            {discussions.map((d) => (
              <PostCard
                key={d.id}
                discussion={d}
                onOpen={onOpenPost}
                onReport={onReport}
              />
            ))}
          </div>
        </section>
      )}

      {members.length > 0 && (
        <section>
          <h2 className="text-text-muted mb-2 font-mono text-xs uppercase">
            Members
          </h2>
          <div className="flex flex-col gap-3">
            {members.slice(0, 8).map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onView={onViewMember}
                onRequest={onViewMember}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
