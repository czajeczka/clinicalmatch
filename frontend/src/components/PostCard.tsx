import type { Discussion } from '@/types'
import { Card } from './Card'
import { Tag } from './Badge'
import { Avatar } from './Avatar'
import { IconButton } from './IconButton'
import { ReactionSummary } from './ReactionBar'
import { ChatIcon, PinIcon, TrendingIcon, FlagIcon } from './icons'
import { timeAgo } from '@/lib/format'
import { isAnonymous } from '@/lib/community'
import { colorForDisease } from '@/lib/diseases'
import { cn } from '@/lib/cn'

interface PostCardProps {
  discussion: Discussion
  onOpen: (discussion: Discussion) => void
  onReport?: (discussion: Discussion) => void
  pinned?: boolean
  trending?: boolean
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'M'
}

/** A community post in a feed: title, snippet, tags, author (anonymous-aware),
 *  reaction glance, reply count, and an optional pinned/trending marker. */
export function PostCard({
  discussion,
  onOpen,
  onReport,
  pinned,
  trending,
}: PostCardProps) {
  const anon = isAnonymous(discussion.id)
  const author = anon ? 'Anonymous member' : discussion.author_name
  const title =
    discussion.title || discussion.content.split('\n')[0].slice(0, 80)

  return (
    <Card
      interactive
      onClick={() => onOpen(discussion)}
      className="group flex flex-col gap-2.5"
    >
      {(pinned || trending) && (
        <div className="flex items-center gap-2">
          {pinned && (
            <span className="text-primary bg-primary/10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium">
              <PinIcon className="h-3 w-3" /> Pinned
            </span>
          )}
          {trending && (
            <span className="text-accent bg-accent/12 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium">
              <TrendingIcon className="h-3 w-3" /> Trending
            </span>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar
          initials={anon ? '?' : initialsOf(author)}
          color={anon ? undefined : colorForDisease(author)}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-text group-hover:text-primary leading-snug font-semibold transition-colors">
            {title}
          </h3>
          <p className="text-text-muted mt-0.5 line-clamp-2 text-sm">
            {discussion.content}
          </p>
        </div>
        {onReport && (
          <IconButton
            label="Report post"
            className="-mt-1.5 -mr-1.5 h-9 w-9 shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onReport(discussion)
            }}
          >
            <FlagIcon className="text-text-muted h-[18px] w-[18px]" />
          </IconButton>
        )}
      </div>

      {discussion.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {discussion.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}

      <div
        className={cn(
          'border-border/70 text-text-muted mt-0.5 flex items-center justify-between gap-3 border-t pt-2.5 font-mono text-xs'
        )}
      >
        <span className="truncate">
          {author} · {timeAgo(discussion.created_at)}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <ReactionSummary postId={discussion.id} />
          <span className="inline-flex items-center gap-1">
            <ChatIcon className="h-3.5 w-3.5" />
            {discussion.reply_count}
          </span>
        </span>
      </div>
    </Card>
  )
}
