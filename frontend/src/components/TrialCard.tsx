import type { Trial } from '@/types'
import { Card } from './Card'
import { DiseasePill, StatusBadge } from './Badge'
import { IconButton } from './IconButton'
import { HeartIcon, MapPinIcon } from './icons'
import { useApp } from '@/store/store'

interface TrialCardProps {
  trial: Trial
  onOpen: (trial: Trial) => void
}

export function TrialCard({ trial, onOpen }: TrialCardProps) {
  const { isSaved, toggleSave } = useApp()
  const saved = isSaved(trial.id)
  return (
    <Card interactive onClick={() => onOpen(trial)} className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DiseasePill disease={trial.disease} />
          <StatusBadge status={trial.status} />
        </div>
        <IconButton
          label={saved ? 'Remove from saved' : 'Save trial'}
          aria-pressed={saved}
          className="-mt-2 -mr-2 shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            toggleSave(trial.id)
          }}
        >
          <HeartIcon
            filled={saved}
            className={
              saved ? 'text-accent h-5 w-5' : 'text-text-muted h-5 w-5'
            }
          />
        </IconButton>
      </div>

      <h3 className="font-display text-text mt-2.5 leading-snug font-semibold">
        {trial.title}
      </h3>
      <p className="text-text-muted mt-1 line-clamp-2 text-sm">
        {trial.short_description}
      </p>

      <div className="text-text-muted mt-3 flex items-center gap-3 font-mono text-xs">
        <span className="inline-flex items-center gap-1">
          <MapPinIcon className="h-3.5 w-3.5" />
          {trial.city}, {trial.country}
        </span>
        <span>{trial.phase}</span>
      </div>
    </Card>
  )
}
