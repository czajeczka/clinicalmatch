import type { Discussion } from '@/types'
import { Card } from './Card'
import { Tag } from './Badge'
import { timeAgo } from '@/lib/format'

interface DiscussionCardProps {
  discussion: Discussion
  onOpen: (discussion: Discussion) => void
}

export function DiscussionCard({ discussion, onOpen }: DiscussionCardProps) {
  const title =
    discussion.title || discussion.content.split('\n')[0].slice(0, 80)
  return (
    <Card
      interactive
      onClick={() => onOpen(discussion)}
      className="flex flex-col gap-2"
    >
      <h3 className="font-display text-text leading-snug font-semibold">
        {title}
      </h3>
      <p className="text-text-muted line-clamp-2 text-sm">
        {discussion.content}
      </p>
      {discussion.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {discussion.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}
      <div className="text-text-muted flex items-center gap-2 font-mono text-xs">
        <span>{discussion.author_name}</span>
        <span aria-hidden>·</span>
        <span>{timeAgo(discussion.created_at)}</span>
        <span aria-hidden>·</span>
        <span>
          {discussion.reply_count}{' '}
          {discussion.reply_count === 1 ? 'reply' : 'replies'}
        </span>
      </div>
    </Card>
  )
}
