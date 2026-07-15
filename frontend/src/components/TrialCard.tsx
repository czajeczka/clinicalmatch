import type { Trial } from '@/types'
import { Card } from './Card'
import { DiseasePill, StatusBadge, PhaseBadge } from './Badge'
import { MetaItem } from './Meta'
import { IconButton } from './IconButton'
import { HeartIcon, MapPinIcon, BuildingIcon, ShareIcon } from './icons'
import { useApp } from '@/store/store'
import { shareTrial } from '@/lib/share'

interface TrialCardProps {
  trial: Trial
  onOpen: (trial: Trial) => void
}

export function TrialCard({ trial, onOpen }: TrialCardProps) {
  const { isSaved, toggleSave, toast } = useApp()
  const saved = isSaved(trial.id)

  return (
    <Card
      interactive
      onClick={() => onOpen(trial)}
      className="group flex h-full flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <DiseasePill disease={trial.disease} />
          <StatusBadge status={trial.status} />
        </div>
        <div className="-mt-1.5 -mr-1.5 flex shrink-0 items-center">
          <IconButton
            label="Share trial"
            className="h-9 w-9"
            onClick={(e) => {
              e.stopPropagation()
              void shareTrial(trial, toast)
            }}
          >
            <ShareIcon className="text-text-muted h-[18px] w-[18px]" />
          </IconButton>
          <IconButton
            label={saved ? 'Remove from saved' : 'Save trial'}
            aria-pressed={saved}
            className="h-9 w-9"
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
      </div>

      <div className="min-w-0">
        <h3 className="font-display text-text group-hover:text-primary line-clamp-2 leading-snug font-semibold transition-colors">
          {trial.title}
        </h3>
        <p className="text-text-muted mt-1.5 line-clamp-2 text-sm">
          {trial.short_description}
        </p>
      </div>

      {/* Scannable metadata footer */}
      <div className="border-border/70 mt-auto flex flex-col gap-2 border-t pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <PhaseBadge phase={trial.phase} />
          <MetaItem icon={<MapPinIcon />}>
            {trial.city}, {trial.country}
          </MetaItem>
        </div>
        {trial.sponsor && (
          <MetaItem icon={<BuildingIcon />} className="w-full">
            {trial.sponsor}
          </MetaItem>
        )}
      </div>
    </Card>
  )
}
