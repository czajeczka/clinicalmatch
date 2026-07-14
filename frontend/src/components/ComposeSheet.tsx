import { useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { Input, Textarea } from './Field'
import { Tag } from './Badge'
import { DisclaimerNote } from './DisclaimerNote'
import { SparkIcon } from './icons'
import { useAiAction } from '@/hooks/useAiAction'
import { useOnline } from '@/hooks/useOnline'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'
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
 * "Start a discussion" bottom sheet with optional AI enhancement. The original
 * and the improved draft are shown side by side; the user accepts or edits.
 * "Publish as-is" always works — the AI enhancement is deferred/mocked
 * (TODO: LLM API (seminar 6)) and the board never depends on it.
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
  const [publishing, setPublishing] = useState(false)
  const enhance = useAiAction(api.enhancePost)

  function reset() {
    setTitle('')
    setMessage('')
    setPublishing(false)
    enhance.reset()
  }

  function close() {
    reset()
    onClose()
  }

  async function publish(enhancement: PostEnhancement | null) {
    setPublishing(true)
    try {
      await api.createDiscussion({
        group_id: groupId,
        title: enhancement?.title ?? (title || undefined),
        content: enhancement?.improvedContent ?? message,
        tags: enhancement?.tags ?? [],
        summary: enhancement?.summary,
      })
      toast('Discussion published', 'success')
      reset()
      onPublished()
      onClose()
    } catch {
      setPublishing(false)
      toast('Couldn’t publish right now. Please try again.', 'error')
    }
  }

  return (
    <BottomSheet open={open} onClose={close} title="Start a discussion">
      <div className="space-y-4">
        <Input
          label="Title"
          placeholder="Optional"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          label="Message"
          required
          placeholder="Share a question, an update, or a bit of encouragement…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {/* AI enhancement (mocked — TODO: LLM API (seminar 6)) */}
        {online && (
          <div>
            <Button
              variant="secondary"
              size="sm"
              disabled={!message.trim()}
              loading={enhance.loading}
              loadingLabel="Polishing…"
              onClick={() =>
                enhance.run({ title: title || undefined, message, groupName })
              }
            >
              <SparkIcon className="h-4 w-4" />
              Enhance with AI
            </Button>
            {enhance.error && (
              <p className="text-text-muted mt-2 text-sm">
                Couldn’t enhance right now — you can still publish as-is.
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
                <p className="text-text mt-1 text-sm font-medium">
                  {enhance.data.title}
                </p>
                <p className="text-text mt-1 text-sm whitespace-pre-wrap">
                  {enhance.data.improvedContent}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {enhance.data.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </div>
            </div>
            <DisclaimerNote className="mt-3">
              AI suggestions are optional. You’re always in control of what gets
              posted.
            </DisclaimerNote>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                loading={publishing}
                onClick={() => publish(enhance.data)}
              >
                Use suggestion
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
            onClick={() => publish(null)}
          >
            Publish
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
