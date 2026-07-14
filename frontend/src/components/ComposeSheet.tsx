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
}

/**
 * "Start a discussion" bottom sheet with optional AI enhancement. The original
 * and the improved draft are shown side by side; the user accepts or edits.
 * "Publish as-is" always works — the board never depends on the AI call.
 */
export function ComposeSheet({
  open,
  onClose,
  groupId,
  groupName,
}: ComposeSheetProps) {
  const { addDiscussion } = useApp()
  const online = useOnline()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [applied, setApplied] = useState<PostEnhancement | null>(null)
  const enhance = useAiAction(api.enhancePost)

  function reset() {
    setTitle('')
    setMessage('')
    setApplied(null)
    enhance.reset()
  }

  function publish(useEnhancement: boolean) {
    const src = useEnhancement && applied ? applied : null
    addDiscussion({
      group_id: groupId,
      title: src?.title ?? title,
      content: src?.improvedContent ?? message,
      tags: src?.tags ?? [],
      summary: src?.summary,
    })
    reset()
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Start a discussion"
    >
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

        {/* AI enhancement */}
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
                onClick={() => {
                  setApplied(enhance.data)
                  publish(true)
                }}
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
          <Button
            variant="ghost"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button disabled={!message.trim()} onClick={() => publish(false)}>
            Publish
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
