import { useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { Avatar } from './Avatar'
import { MapPinIcon, GlobeIcon, UsersIcon } from './icons'
import {
  sendBuddyRequest,
  isBuddyRequested,
  type Member,
} from '@/lib/community'
import { useApp } from '@/store/store'

interface MemberProfileSheetProps {
  member: Member | null
  open: boolean
  onClose: () => void
}

/** Full member profile inside the community: avatar, nickname, country, joined
 *  communities, bio, badges, recent posts, and a buddy request action. */
export function MemberProfileSheet({
  member,
  open,
  onClose,
}: MemberProfileSheetProps) {
  const { toast } = useApp()
  const [requested, setRequested] = useState(false)

  if (!member) return null

  const alreadyRequested = requested || isBuddyRequested(member.id)

  function request() {
    if (!member) return
    sendBuddyRequest(member.id)
    setRequested(true)
    toast(`Buddy request sent to ${member.nickname}`, 'success')
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Member profile">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <Avatar initials={member.initials} color={member.color} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-text text-lg font-semibold">
              {member.nickname}
            </h3>
            <div className="text-text-muted mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="h-3.5 w-3.5" /> {member.country}
              </span>
              <span className="inline-flex items-center gap-1">
                <GlobeIcon className="h-3.5 w-3.5" /> {member.language}
              </span>
              <span>{member.stage}</span>
            </div>
          </div>
        </div>

        <p className="text-text text-sm leading-relaxed">{member.bio}</p>

        {member.badges.length > 0 && (
          <div>
            <p className="text-text-muted mb-2 font-mono text-xs uppercase">
              Badges
            </p>
            <div className="flex flex-wrap gap-1.5">
              {member.badges.map((b) => (
                <span
                  key={b}
                  className="bg-secondary/12 text-secondary inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-text-muted mb-2 font-mono text-xs uppercase">
            Communities
          </p>
          <div className="flex flex-wrap gap-1.5">
            {member.joinedCommunities.map((c) => (
              <span
                key={c}
                className="border-border text-text inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
              >
                <UsersIcon className="h-3.5 w-3.5" />
                {c}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-text-muted mb-2 font-mono text-xs uppercase">
            Recent posts
          </p>
          <ul className="space-y-1.5">
            {member.recentPosts.map((p, i) => (
              <li
                key={i}
                className="border-border bg-surface-muted rounded-[var(--radius-control)] border px-3 py-2 text-sm"
              >
                <span className="text-text">{p.title}</span>
                <span className="text-text-muted ml-2 font-mono text-xs">
                  {p.at}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Button fullWidth disabled={alreadyRequested} onClick={request}>
          {alreadyRequested ? 'Buddy request sent' : 'Send buddy request'}
        </Button>
      </div>
    </BottomSheet>
  )
}
