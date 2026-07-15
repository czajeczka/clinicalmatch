import { useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { Chip } from './Chip'
import { Input, Textarea } from './Field'
import { Tag } from './Badge'
import { DisclaimerNote } from './DisclaimerNote'
import { SparkIcon, CheckIcon } from './icons'
import { cn } from '@/lib/cn'
import { useAiAction } from '@/hooks/useAiAction'
import { useOnline } from '@/hooks/useOnline'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'
import { COMMUNITY_TAGS, markAnonymous } from '@/lib/community'
import type { PostEnhancement } from '@/types'

interface ComposeSheetProps {
  open: boolean
  onClose: () => void
  groupId: string
  groupName: string
  /** Called after a discussion is successfully published (board reloads). */
  onPublished: () => void
}

/**
 * "Create post" composer: title, body, optional tags, optional anonymous
 * posting, and an optional AI assistant (grammar/readability, a title, a
 * summary and suggested tags) via the backend LLM abstraction. Publishing
 * always works; the AI is a suggestion the user applies and can still edit.
 */
export function ComposeSheet({
  open,
  onClose,
  groupId,
  groupName,
  onPublished,
}: ComposeSheetProps) {
  const { toast } = useApp()
  const online = useOnline()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [summary, setSummary] = useState<string | undefined>(undefined)
  const [anonymous, setAnonymous] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const enhance = useAiAction(api.enhancePost)

  function reset() {
    setTitle('')
    setMessage('')
    setTags([])
    setSummary(undefined)
    setAnonymous(false)
    setPublishing(false)
    enhance.reset()
  }

  function close() {
    reset()
    onClose()
  }

  function toggleTag(t: string) {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  function applySuggestion(s: PostEnhancement) {
    if (s.title) setTitle(s.title)
    if (s.improvedContent) setMessage(s.improvedContent)
    setTags((prev) => [...new Set([...prev, ...s.tags])])
    setSummary(s.summary)
    enhance.reset()
    toast('AI suggestions applied — edit anything before posting', 'success')
  }

  async function publish() {
    if (!message.trim() || publishing) return
    setPublishing(true)
    try {
      const created = await api.createDiscussion({
        group_id: groupId,
        title: title.trim() || undefined,
        content: message.trim(),
        tags,
        summary,
      })
      if (anonymous && created?.id) markAnonymous(created.id)
      toast('Post published', 'success')
      reset()
      onPublished()
      onClose()
    } catch {
      setPublishing(false)
      toast('Couldn’t publish right now. Please try again.', 'error')
    }
  }

  return (
    <BottomSheet open={open} onClose={close} title="Create post">
      <div className="space-y-4">
        <Input
          label="Title"
          placeholder="Optional — a short, clear headline"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          label="Your post"
          required
          placeholder="Share a question, an update, or a bit of encouragement…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {/* Tags */}
        <div>
          <p className="text-text mb-1.5 block text-sm font-medium">
            Tags <span className="text-text-muted font-normal">(optional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_TAGS.map((t) => (
              <Chip
                key={t}
                selected={tags.includes(t)}
                onClick={() => toggleTag(t)}
              >
                {t}
              </Chip>
            ))}
          </div>
        </div>

        {/* Anonymous */}
        <button
          type="button"
          role="switch"
          aria-checked={anonymous}
          onClick={() => setAnonymous((v) => !v)}
          className="border-border hover:border-primary/40 flex w-full items-center justify-between rounded-[var(--radius-control)] border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          <span>
            <span className="text-text block text-sm font-medium">
              Post anonymously
            </span>
            <span className="text-text-muted block text-xs">
              Your name is hidden on this device’s view of the post.
            </span>
          </span>
          <span
            className={cn(
              'relative h-6 w-10 shrink-0 rounded-full transition-colors',
              anonymous ? 'bg-primary' : 'bg-border'
            )}
            aria-hidden
          >
            <span
              className={cn(
                'bg-surface absolute top-0.5 h-5 w-5 rounded-full shadow transition-transform',
                anonymous ? 'translate-x-[18px]' : 'translate-x-[2px]'
              )}
            />
          </span>
        </button>

        {/* AI assistant */}
        {online && (
          <div>
            <Button
              variant="secondary"
              size="sm"
              disabled={!message.trim()}
              loading={enhance.loading}
              loadingLabel="Asking the assistant…"
              onClick={() =>
                enhance.run({ title: title || undefined, message, groupName })
              }
            >
              <SparkIcon className="h-4 w-4" />
              Improve with AI
            </Button>
            {enhance.error && (
              <p className="text-text-muted mt-2 text-sm">
                Couldn’t reach the assistant — you can still publish as-is.
              </p>
            )}
          </div>
        )}

        {enhance.data && (
          <div className="border-border bg-surface-muted rounded-[var(--radius-card)] border p-3">
            <p className="text-text-muted mb-2 font-mono text-xs uppercase">
              Suggested improvement
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-text-muted text-xs">Your version</p>
                <p className="text-text mt-1 text-sm whitespace-pre-wrap">
                  {message}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Suggested</p>
                {enhance.data.title && (
                  <p className="text-text mt-1 text-sm font-semibold">
                    {enhance.data.title}
                  </p>
                )}
                <p className="text-text mt-1 text-sm whitespace-pre-wrap">
                  {enhance.data.improvedContent}
                </p>
                {enhance.data.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {enhance.data.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DisclaimerNote className="mt-3">
              AI suggestions are optional. You’re always in control of what gets
              posted.
            </DisclaimerNote>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => applySuggestion(enhance.data!)}>
                <CheckIcon className="h-4 w-4" />
                Apply suggestion
              </Button>
              <Button variant="ghost" size="sm" onClick={() => enhance.reset()}>
                Keep mine
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!message.trim()}
            loading={publishing}
            loadingLabel="Publishing…"
            onClick={publish}
          >
            Publish
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
