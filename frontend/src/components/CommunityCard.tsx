import type { SupportGroup } from '@/types'
import { Card } from './Card'
import { Button } from './Button'
import { Avatar } from './Avatar'
import { CommunityCover } from './CommunityCover'
import { UsersIcon } from './icons'
import { useApp } from '@/store/store'
import { communityMeta } from '@/lib/community'

interface CommunityCardProps {
  group: SupportGroup
  onOpen: (group: SupportGroup) => void
}

/** Rich community card: cover, description, members + online, moderators and a
 *  join/leave control. The whole card opens the community. */
export function CommunityCard({ group, onOpen }: CommunityCardProps) {
  const { isJoined, toggleJoin } = useApp()
  const joined = isJoined(group.id)
  const meta = communityMeta(group)

  return (
    <Card
      interactive
      onClick={() => onOpen(group)}
      className="group flex flex-col gap-3"
    >
      <CommunityCover group={group} className="-mx-1 h-24 rounded-[12px] p-3">
        <div className="relative flex h-full flex-col justify-between">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-black/25 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
            <span className="bg-success h-1.5 w-1.5 rounded-full" aria-hidden />
            {meta.onlineCount} online
          </span>
          <h3 className="font-display text-lg leading-tight font-semibold text-white drop-shadow-sm">
            {group.name}
          </h3>
        </div>
      </CommunityCover>

      <p className="text-text-muted line-clamp-2 text-sm">
        {group.description}
      </p>

      {/* Moderators */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {meta.moderators.slice(0, 3).map((m) => (
            <Avatar
              key={m.name}
              initials={m.initials}
              size="sm"
              className="ring-surface rounded-full ring-2"
              title={m.name}
            />
          ))}
        </div>
        <span className="text-text-muted truncate text-xs">
          Moderated by {meta.moderators.map((m) => m.name).join(', ')}
        </span>
      </div>

      <div className="border-border/70 mt-auto flex items-center justify-between border-t pt-3">
        <span className="text-text-muted inline-flex items-center gap-1.5 font-mono text-xs">
          <UsersIcon className="h-4 w-4" />
          {group.member_count.toLocaleString()} members
        </span>
        <Button
          variant={joined ? 'secondary' : 'primary'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            toggleJoin(group.id, group.name)
          }}
        >
          {joined ? 'Joined' : 'Join'}
        </Button>
      </div>
    </Card>
  )
}
