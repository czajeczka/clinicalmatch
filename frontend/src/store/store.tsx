import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Discussion, Reply, User } from '@/types'
import { loadUser, saveUser as persistUser } from '@/lib/identity'
import { useLocalState } from '@/hooks/useLocalState'
import { MOCK_DISCUSSIONS, MOCK_REPLIES } from '@/mock/data'

export type ToastKind = 'success' | 'info' | 'error'
export interface Toast {
  id: number
  message: string
  kind: ToastKind
}

interface AppContextValue {
  // identity
  user: User | null
  setUser: (user: User) => void

  // saved trials (client-side; TODO: connect to API)
  savedTrialIds: string[]
  isSaved: (trialId: string) => boolean
  toggleSave: (trialId: string) => void

  // group memberships (TODO: connect to API)
  joinedGroupIds: string[]
  isJoined: (groupId: string) => boolean
  toggleJoin: (groupId: string, groupName?: string) => void

  // community content (seeded from mock; mutated locally)
  discussions: Discussion[]
  replies: Reply[]
  discussionsForGroup: (groupId: string) => Discussion[]
  repliesForDiscussion: (discussionId: string) => Reply[]
  getDiscussion: (id: string) => Discussion | undefined
  addDiscussion: (input: {
    group_id: string
    title?: string
    content: string
    tags?: string[]
    summary?: string
  }) => Discussion
  updateDiscussion: (id: string, patch: Partial<Discussion>) => void
  deleteDiscussion: (id: string) => void
  addReply: (discussionId: string, content: string) => void
  deleteReply: (id: string) => void
  isOwn: (authorId: string) => boolean

  // toasts
  toasts: Toast[]
  toast: (message: string, kind?: ToastKind) => void
  dismissToast: (id: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

let toastSeq = 0
let idSeq = 0
function localId(prefix: string): string {
  idSeq += 1
  return `${prefix}-local-${idSeq}`
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => loadUser())

  const [savedTrialIds, setSaved] = useLocalState<string[]>(
    'clinicalmatch.saved',
    []
  )
  const [joinedGroupIds, setJoined] = useLocalState<string[]>(
    'clinicalmatch.joined',
    []
  )
  const [discussions, setDiscussions] = useLocalState<Discussion[]>(
    'clinicalmatch.discussions',
    MOCK_DISCUSSIONS
  )
  const [replies, setReplies] = useLocalState<Reply[]>(
    'clinicalmatch.replies',
    MOCK_REPLIES
  )
  const [toasts, setToasts] = useState<Toast[]>([])

  const setUser = useCallback((u: User) => {
    persistUser(u)
    setUserState(u)
  }, [])

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++toastSeq
    setToasts((prev) => [...prev, { id, message, kind }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismissToast = useCallback(
    (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  )

  const isSaved = useCallback(
    (trialId: string) => savedTrialIds.includes(trialId),
    [savedTrialIds]
  )
  const toggleSave = useCallback(
    (trialId: string) => {
      // TODO: connect to API — POST/DELETE /saved-trials (idempotent)
      setSaved((prev) =>
        prev.includes(trialId)
          ? prev.filter((id) => id !== trialId)
          : [...prev, trialId]
      )
      toast(
        savedTrialIds.includes(trialId)
          ? 'Removed from saved'
          : 'Saved to your profile',
        'success'
      )
    },
    [setSaved, toast, savedTrialIds]
  )

  const isJoined = useCallback(
    (groupId: string) => joinedGroupIds.includes(groupId),
    [joinedGroupIds]
  )
  const toggleJoin = useCallback(
    (groupId: string, groupName?: string) => {
      // TODO: connect to API — POST/DELETE /memberships (idempotent)
      const joining = !joinedGroupIds.includes(groupId)
      setJoined((prev) =>
        prev.includes(groupId)
          ? prev.filter((id) => id !== groupId)
          : [...prev, groupId]
      )
      toast(
        joining
          ? `Joined ${groupName ?? 'the community'}`
          : `Left ${groupName ?? 'the community'}`,
        'success'
      )
    },
    [setJoined, toast, joinedGroupIds]
  )

  const isOwn = useCallback(
    (authorId: string) => !!user && authorId === user.id,
    [user]
  )

  const discussionsForGroup = useCallback(
    (groupId: string) =>
      discussions
        .filter((d) => d.group_id === groupId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [discussions]
  )
  const repliesForDiscussion = useCallback(
    (discussionId: string) =>
      replies
        .filter((r) => r.discussion_id === discussionId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [replies]
  )
  const getDiscussion = useCallback(
    (id: string) => discussions.find((d) => d.id === id),
    [discussions]
  )

  const addDiscussion = useCallback<AppContextValue['addDiscussion']>(
    (input) => {
      // TODO: connect to API — POST /discussions
      const d: Discussion = {
        id: localId('d'),
        group_id: input.group_id,
        author_id: user?.id ?? 'anon',
        author_name: user?.display_name ?? 'You',
        title: input.title?.trim() || undefined,
        content: input.content.trim(),
        tags: input.tags ?? [],
        summary: input.summary,
        created_at: new Date().toISOString(),
        reply_count: 0,
      }
      setDiscussions((prev) => [d, ...prev])
      toast('Discussion published', 'success')
      return d
    },
    [setDiscussions, toast, user]
  )

  const updateDiscussion = useCallback(
    (id: string, patch: Partial<Discussion>) => {
      // TODO: connect to API — PATCH /discussions/:id (own posts only)
      setDiscussions((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
      )
      toast('Post updated', 'success')
    },
    [setDiscussions, toast]
  )

  const deleteDiscussion = useCallback(
    (id: string) => {
      // TODO: connect to API — DELETE /discussions/:id (own posts only)
      setDiscussions((prev) => prev.filter((d) => d.id !== id))
      setReplies((prev) => prev.filter((r) => r.discussion_id !== id))
      toast('Post deleted', 'success')
    },
    [setDiscussions, setReplies, toast]
  )

  const addReply = useCallback(
    (discussionId: string, content: string) => {
      // TODO: connect to API — POST /discussions/:id/replies
      const r: Reply = {
        id: localId('r'),
        discussion_id: discussionId,
        author_id: user?.id ?? 'anon',
        author_name: user?.display_name ?? 'You',
        content: content.trim(),
        created_at: new Date().toISOString(),
      }
      setReplies((prev) => [...prev, r])
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === discussionId ? { ...d, reply_count: d.reply_count + 1 } : d
        )
      )
    },
    [setReplies, setDiscussions, user]
  )

  const deleteReply = useCallback(
    (id: string) => {
      // TODO: connect to API — DELETE /replies/:id (own only)
      setReplies((prev) => {
        const target = prev.find((r) => r.id === id)
        if (target) {
          setDiscussions((ds) =>
            ds.map((d) =>
              d.id === target.discussion_id
                ? { ...d, reply_count: Math.max(0, d.reply_count - 1) }
                : d
            )
          )
        }
        return prev.filter((r) => r.id !== id)
      })
      toast('Reply deleted', 'success')
    },
    [setReplies, setDiscussions, toast]
  )

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      setUser,
      savedTrialIds,
      isSaved,
      toggleSave,
      joinedGroupIds,
      isJoined,
      toggleJoin,
      discussions,
      replies,
      discussionsForGroup,
      repliesForDiscussion,
      getDiscussion,
      addDiscussion,
      updateDiscussion,
      deleteDiscussion,
      addReply,
      deleteReply,
      isOwn,
      toasts,
      toast,
      dismissToast,
    }),
    [
      user,
      setUser,
      savedTrialIds,
      isSaved,
      toggleSave,
      joinedGroupIds,
      isJoined,
      toggleJoin,
      discussions,
      replies,
      discussionsForGroup,
      repliesForDiscussion,
      getDiscussion,
      addDiscussion,
      updateDiscussion,
      deleteDiscussion,
      addReply,
      deleteReply,
      isOwn,
      toasts,
      toast,
      dismissToast,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
