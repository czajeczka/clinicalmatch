import { useState } from 'react'
import { cn } from '@/lib/cn'
import {
  REACTIONS,
  getReactionState,
  setReaction,
  type ReactionKind,
  type ReactionState,
} from '@/lib/community'

/** Total reactions across all kinds. */
function total(state: ReactionState): number {
  return Object.values(state.counts).reduce((a, b) => a + b, 0)
}

interface ReactionBarProps {
  postId: string
  className?: string
}

/**
 * Interactive reaction bar: ❤️ Support · 🤗 Hug · 🙏 Thinking of you · 💙 Helpful.
 * One reaction per person (toggle/switch), persisted per device. Used on the
 * post detail; the feed shows the read-only {@link ReactionSummary}.
 */
export function ReactionBar({ postId, className }: ReactionBarProps) {
  const [state, setState] = useState<ReactionState>(() =>
    getReactionState(postId)
  )

  function toggle(kind: ReactionKind) {
    setState(setReaction(postId, kind))
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {REACTIONS.map(({ kind, emoji, label }) => {
        const active = state.mine === kind
        const count = state.counts[kind]
        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            aria-pressed={active}
            aria-label={`${label}${count ? `, ${count}` : ''}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-[colors,transform] duration-150 active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
              active
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-surface text-text-muted hover:border-primary/30 hover:text-text'
            )}
          >
            <span aria-hidden className="text-[15px] leading-none">
              {emoji}
            </span>
            <span className="min-w-3 text-center tabular-nums">{count}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Compact, non-interactive reaction glance for cards/feeds. */
export function ReactionSummary({ postId }: { postId: string }) {
  const state = getReactionState(postId)
  const sum = total(state)
  const shown = REACTIONS.filter((r) => state.counts[r.kind] > 0).slice(0, 3)
  if (sum === 0) {
    return (
      <span className="text-text-muted text-xs">Be the first to react</span>
    )
  }
  return (
    <span className="text-text-muted inline-flex items-center gap-1 text-xs">
      <span aria-hidden className="flex">
        {shown.map((r) => (
          <span key={r.kind} className="-ml-0.5 first:ml-0">
            {r.emoji}
          </span>
        ))}
      </span>
      <span className="tabular-nums">{sum}</span>
    </span>
  )
}
