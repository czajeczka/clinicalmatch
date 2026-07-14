import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input, Textarea } from '@/components/Field'
import { Tag } from '@/components/Badge'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { timeAgo } from '@/lib/format'
import { useApp } from '@/store/store'

export function Thread() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const {
    getDiscussion,
    repliesForDiscussion,
    addReply,
    deleteReply,
    updateDiscussion,
    deleteDiscussion,
    isOwn,
  } = useApp()

  const discussion = getDiscussion(id)
  const replies = repliesForDiscussion(id)
  const [reply, setReply] = useState('')
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(discussion?.title ?? '')
  const [editContent, setEditContent] = useState(discussion?.content ?? '')
  const [confirmDelete, setConfirmDelete] = useState<
    { kind: 'post' } | { kind: 'reply'; replyId: string } | null
  >(null)

  if (!discussion) {
    return (
      <div>
        <Header title="Discussion" back />
        <EmptyState
          title="Discussion not found"
          body="It may have been deleted."
          actionLabel="Back"
          onAction={() => navigate(-1)}
        />
      </div>
    )
  }

  const ownPost = isOwn(discussion.author_id)

  function submitReply() {
    if (!reply.trim()) return
    addReply(discussion!.id, reply)
    setReply('')
  }

  function saveEdit() {
    updateDiscussion(discussion!.id, {
      title: editTitle.trim() || undefined,
      content: editContent.trim(),
    })
    setEditing(false)
  }

  return (
    <div>
      <Header title="Discussion" back display={false} />

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
                {ownPost && (
                  <span className="flex gap-3">
                    <button
                      className="text-primary"
                      onClick={() => {
                        setEditTitle(discussion.title ?? '')
                        setEditContent(discussion.content)
                        setEditing(true)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-danger"
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
          <h2 className="text-text-muted mb-2 px-1 font-mono text-xs uppercase">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </h2>
          {replies.length === 0 ? (
            <p className="text-text-muted px-1 text-sm">
              No replies yet — start the conversation.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {replies.map((r) => (
                <Card key={r.id}>
                  <p className="text-text text-sm whitespace-pre-wrap">
                    {r.content}
                  </p>
                  <div className="text-text-muted mt-2 flex items-center justify-between font-mono text-xs">
                    <span>
                      {r.author_name} · {timeAgo(r.created_at)}
                    </span>
                    {isOwn(r.author_id) && (
                      <button
                        className="text-danger"
                        onClick={() =>
                          setConfirmDelete({ kind: 'reply', replyId: r.id })
                        }
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reply composer */}
      <div className="border-border bg-bg/90 fixed inset-x-0 bottom-16 z-20 border-t px-4 py-3 backdrop-blur-md lg:bottom-0">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Input
            aria-label="Write a reply"
            placeholder="Write a reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submitReply()
              }
            }}
            className="flex-1"
          />
          <Button disabled={!reply.trim()} onClick={submitReply}>
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
            deleteDiscussion(discussion.id)
            setConfirmDelete(null)
            navigate(-1)
          } else if (confirmDelete?.kind === 'reply') {
            deleteReply(confirmDelete.replyId)
            setConfirmDelete(null)
          }
        }}
      />
    </div>
  )
}
