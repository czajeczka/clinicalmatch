import { useState } from 'react'
import { Card } from './Card'
import { Button } from './Button'
import { UsersIcon, CalendarIcon } from './icons'
import { toggleMeetup, isMeetupJoined, type Meetup } from '@/lib/community'
import { useApp } from '@/store/store'

function parts(iso: string) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString(undefined, { day: '2-digit' }),
    month: d.toLocaleDateString(undefined, { month: 'short' }),
    when: d.toLocaleDateString(undefined, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

/** An upcoming community meetup (mock data). Join is a device-local toggle. */
export function MeetupCard({ meetup }: { meetup: Meetup }) {
  const { toast } = useApp()
  const [joined, setJoined] = useState(() => isMeetupJoined(meetup.id))
  const { day, month, when } = parts(meetup.whenISO)
  const count = meetup.participants + (joined ? 1 : 0)

  function toggle() {
    const now = toggleMeetup(meetup.id)
    setJoined(now)
    toast(now ? 'You’re going 🎉' : 'Left the meetup', 'success')
  }

  return (
    <Card className="flex items-center gap-3">
      <div className="border-border bg-surface-muted flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[var(--radius-control)] border">
        <span className="font-display text-text text-lg leading-none font-semibold">
          {day}
        </span>
        <span className="text-text-muted font-mono text-[11px] uppercase">
          {month}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-text text-sm font-semibold">{meetup.title}</p>
        <p className="text-text-muted mt-0.5 line-clamp-1 text-xs">
          {meetup.description}
        </p>
        <div className="text-text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            {when}
          </span>
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" />
            {count} going
          </span>
        </div>
      </div>
      <Button
        variant={joined ? 'secondary' : 'primary'}
        size="sm"
        onClick={toggle}
      >
        {joined ? 'Going' : 'Join'}
      </Button>
    </Card>
  )
}
