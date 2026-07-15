import { Card } from './Card'
import { Button } from './Button'
import { Avatar } from './Avatar'
import { MapPinIcon } from './icons'
import { isBuddyRequested, type Member } from '@/lib/community'

interface MemberCardProps {
  member: Member
  onView: (member: Member) => void
  onRequest: (member: Member) => void
  requested?: boolean
}

/** Compact member row for directories and the buddy finder. */
export function MemberCard({
  member,
  onView,
  onRequest,
  requested,
}: MemberCardProps) {
  const isRequested = requested || isBuddyRequested(member.id)
  return (
    <Card
      interactive
      onClick={() => onView(member)}
      className="flex items-center gap-3"
    >
      <Avatar
        initials={member.initials}
        color={member.color}
        size="md"
        online
      />
      <div className="min-w-0 flex-1">
        <p className="text-text truncate text-sm font-semibold">
          {member.nickname}
        </p>
        <div className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="h-3.5 w-3.5" />
            {member.country}
          </span>
          <span aria-hidden>·</span>
          <span>{member.stage}</span>
          <span aria-hidden>·</span>
          <span>{member.language}</span>
        </div>
      </div>
      <Button
        variant={isRequested ? 'secondary' : 'primary'}
        size="sm"
        disabled={isRequested}
        onClick={(e) => {
          e.stopPropagation()
          onRequest(member)
        }}
      >
        {isRequested ? 'Requested' : 'Add buddy'}
      </Button>
    </Card>
  )
}
