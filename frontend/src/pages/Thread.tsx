import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input, Textarea } from '@/components/Field'
import { Tag } from '@/components/Badge'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonList } from '@/components/Skeleton'
import { ErrorRetry } from '@/components/ErrorRetry'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { timeAgo } from '@/lib/format'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/mock/mockApi'
import { useApp, type ToastKind } from '@/store/store'
import type { Reply } from '@/types'

// Shared focus ring for the inline text buttons (Edit/Delete), matching the
// rest of the design system's focus-visible treatment.
const inlineBtn =
  'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]'

export function Thread() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { isOwn, isAdmin, toast } = useApp()

  const {
    data: discussion,
    loading,
    error,
    reload: reloadDiscussion,
  } = useAsync(() => api.getDiscussion(id), [id])
  const {
    data: replies,
    error: repliesError,
    reload: reloadReplies,
  } = useAsync(() => api.getReplies(id), [id])

  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<
    { kind: 'post' } | { kind: 'reply'; replyId: string } | null
  >(null)

  if (loading) {
    return (
      <div>
        <Header title="Discussion" back display={false} />
        <div className="p-4">
          <SkeletonList count={3} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Discussion" back display={false} />
        <div className="p-4">
          <ErrorRetry
            message="Couldn’t load this discussion."
            onRetry={reloadDiscussion}
          />
        </div>
      </div>
    )
  }

  if (!discussion) {
    return (
      <div>
        <Header title="Discussion" back display={false} />
        <EmptyState
          title="Discussion not found"
          body="It may have been deleted."
          actionLabel="Back"
          onAction={() => navigate(-1)}
        />
      </div>
    )
  }

  // Admins can moderate anyone's content; regular users only their own.
  const canModeratePost = isOwn(discussion.author_id) || isAdmin
  const replyList = replies ?? []

  function submitReply() {
    const content = reply.trim()
    if (!content || sending) return
    // Keep the draft until the post succeeds, so a failure never loses text.
    setSending(true)
    api
      .createReply(discussion!.id, content)
      .then(() => {
        setReply('')
        reloadReplies()
        toast('Reply posted', 'success')
      })
      .catch(() => toast('Couldn’t post your reply.', 'error'))
      .finally(() => setSending(false))
  }

  function saveEdit() {
    if (savingEdit) return
    setSavingEdit(true)
    api
      .updateDiscussion(discussion!.id, {
        title: editTitle.trim() || undefined,
        content: editContent.trim(),
      })
      .then(() => {
        setEditing(false)
        reloadDiscussion()
        toast('Post updated', 'success')
      })
      .catch(() => toast('Couldn’t update the post.', 'error'))
      .finally(() => setSavingEdit(false))
  }

  return (
    <div>
      <Header
        title="Discussion"
        back
        display={false}
        heading={!discussion.title}
      />

      <div className="space-y-4 px-4 py-4 pb-28">
        {/* Original post */}
        <Card>
          {editing ? (
            <div className="space-y-3">
              <Input
                label="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <Textarea
                label="Message"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!editContent.trim()}
                  loading={savingEdit}
                  loadingLabel="Saving…"
                  onClick={saveEdit}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {discussion.title && (
                <h1 className="font-display text-text text-xl leading-snug font-semibold">
                  {discussion.title}
                </h1>
              )}
              <p className="text-text mt-2 text-[15px] whitespace-pre-wrap">
                {discussion.content}
              </p>
              {discussion.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {discussion.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              )}
              <div className="text-text-muted mt-3 flex items-center justify-between font-mono text-xs">
                <span>
                  {discussion.author_name} · {timeAgo(discussion.created_at)}
                </span>
                {canModeratePost && (
                  <span className="flex gap-3">
                    <button
                      className={`text-primary ${inlineBtn}`}
                      onClick={() => {
                        setEditTitle(discussion.title ?? '')
                        setEditContent(discussion.content)
                        setEditing(true)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className={`text-danger ${inlineBtn}`}
                      onClick={() => setConfirmDelete({ kind: 'post' })}
                    >
                      Delete
                    </button>
                  </span>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Replies */}
        <div>
          {!repliesError && (
            <h2 className="text-text-muted mb-2 px-1 font-mono text-xs uppercase">
              {replyList.length} {replyList.length === 1 ? 'reply' : 'replies'}
            </h2>
          )}
          {repliesError ? (
            <p className="text-text-muted px-1 text-sm">
              Couldn’t load replies.{' '}
              <button
                className="text-primary rounded-sm underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                onClick={reloadReplies}
              >
                Try again
              </button>
            </p>
          ) : replyList.length === 0 ? (
            <p className="text-text-muted px-1 text-sm">
              No replies yet — start the conversation.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {replyList.map((r) => (
                <ReplyItem
                  key={r.id}
                  reply={r}
                  canModerate={isOwn(r.author_id) || isAdmin}
                  onEdited={reloadReplies}
                  onRequestDelete={() =>
                    setConfirmDelete({ kind: 'reply', replyId: r.id })
                  }
                  toast={toast}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reply composer */}
      <div className="border-border bg-bg/90 fixed inset-x-0 bottom-16 z-20 border-t px-4 py-3 backdrop-blur-md lg:bottom-0 lg:left-60">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            aria-label="Write a reply"
            placeholder="Write a reply…  (Enter to send, Shift+Enter for a new line)"
            value={reply}
            rows={1}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submitReply()
              }
            }}
            className="max-h-32 flex-1 !min-h-11"
          />
          <Button
            disabled={!reply.trim()}
            loading={sending}
            loadingLabel="Sending…"
            onClick={submitReply}
          >
            Reply
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title={
          confirmDelete?.kind === 'post'
            ? 'Delete this post?'
            : 'Delete this reply?'
        }
        body="This can’t be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete?.kind === 'post') {
            api
              .deleteDiscussion(discussion.id)
              .then(() => {
                toast('Post deleted', 'success')
                navigate(-1)
              })
              .catch(() => toast('Couldn’t delete the post.', 'error'))
            setConfirmDelete(null)
          } else if (confirmDelete?.kind === 'reply') {
            const replyId = confirmDelete.replyId
            api
              .deleteReply(replyId)
              .then(() => reloadReplies())
              .catch(() => toast('Couldn’t delete the reply.', 'error'))
            setConfirmDelete(null)
          }
        }}
      />
    </div>
  )
}

/** A single reply with owner/admin moderation: inline edit + delete request. */
function ReplyItem({
  reply,
  canModerate,
  onEdited,
  onRequestDelete,
  toast,
}: {
  reply: Reply
  canModerate: boolean
  onEdited: () => void
  onRequestDelete: () => void
  toast: (message: string, kind?: ToastKind) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(reply.content)
  const [saving, setSaving] = useState(false)

  function save() {
    const content = text.trim()
    if (!content || saving) return
    setSaving(true)
    api
      .updateReply(reply.id, content)
      .then(() => {
        setEditing(false)
        onEdited()
        toast('Reply updated', 'success')
      })
      .catch(() => toast('Couldn’t update the reply.', 'error'))
      .finally(() => setSaving(false))
  }

  return (
    <Card>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            aria-label="Edit reply"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false)
                setText(reply.content)
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!text.trim()}
              loading={saving}
              onClick={save}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-text text-sm whitespace-pre-wrap">
            {reply.content}
          </p>
          <div className="text-text-muted mt-2 flex items-center justify-between font-mono text-xs">
            <span>
              {reply.author_name} · {timeAgo(reply.created_at)}
            </span>
            {canModerate && (
              <span className="flex gap-3">
                <button
                  className={`text-primary ${inlineBtn}`}
                  onClick={() => {
                    setText(reply.content)
                    setEditing(true)
                  }}
                >
                  Edit
                </button>
                <button
                  className={`text-danger ${inlineBtn}`}
                  onClick={onRequestDelete}
                >
                  Delete
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  )
}
