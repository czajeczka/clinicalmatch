import type { SupportGroup } from '@/types'
import { Card } from './Card'
import { Button } from './Button'
import { UsersIcon } from './icons'
import { useApp } from '@/store/store'

interface CommunityCardProps {
  group: SupportGroup
  onOpen: (group: SupportGroup) => void
}

export function CommunityCard({ group, onOpen }: CommunityCardProps) {
  const { isJoined, toggleJoin } = useApp()
  const joined = isJoined(group.id)
  return (
    <Card
      interactive
      onClick={() => onOpen(group)}
      className="flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 h-10 w-10 shrink-0 rounded-[12px]"
          style={{ backgroundColor: `${group.color}22`, color: group.color }}
          aria-hidden
        >
          <UsersIcon className="m-2.5 h-5 w-5" style={{ color: group.color }} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-text leading-snug font-semibold">
            {group.name}
          </h3>
          <p className="text-text-muted mt-0.5 line-clamp-2 text-sm">
            {group.description}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-text-muted font-mono text-xs">
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
