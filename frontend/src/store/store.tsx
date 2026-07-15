import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@/types'
import { loadUser, saveUser as persistUser } from '@/lib/identity'
import { useLocalState } from '@/hooks/useLocalState'
import { api } from '@/mock/mockApi'

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

  // saved trials (backend-backed; ids mirrored to localStorage for offline)
  savedTrialIds: string[]
  isSaved: (trialId: string) => boolean
  toggleSave: (trialId: string) => void

  // group memberships (backend-backed)
  joinedGroupIds: string[]
  isJoined: (groupId: string) => boolean
  toggleJoin: (groupId: string, groupName?: string) => void

  // ownership check for community posts
  isOwn: (authorId: string) => boolean

  // true when the current identity maps to the admin account (role fetched
  // from the backend — the server is the source of truth, buttons are not)
  isAdmin: boolean

  // toasts
  toasts: Toast[]
  toast: (message: string, kind?: ToastKind) => void
  dismissToast: (id: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

let toastSeq = 0

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => loadUser())

  // Cached to localStorage so a reload / offline still shows what was saved.
  // The backend is the source of truth and re-hydrates these when the user is
  // known (see the effect below).
  const [savedTrialIds, setSaved] = useLocalState<string[]>(
    'clinicalmatch.saved',
    []
  )
  const [joinedGroupIds, setJoined] = useLocalState<string[]>(
    'clinicalmatch.joined',
    []
  )
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

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

  const setUser = useCallback((u: User) => {
    persistUser(u)
    setUserState(u)
  }, [])

  // Hydrate saved trials + memberships from the backend once we have an
  // identity. On failure (e.g. offline) we keep the cached ids.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let active = true
    api
      .getSavedTrials()
      .then((trials) => {
        if (active) setSaved(trials.map((t) => t.id))
      })
      .catch(() => {})
    api
      .getMemberships()
      .then((groups) => {
        if (active) setJoined(groups.map((g) => g.id))
      })
      .catch(() => {})
    // Resolve the role server-side; admin controls hinge on this.
    api
      .getUser(userId)
      .then((u) => {
        if (active) setIsAdmin(u?.role === 'admin')
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [userId, setSaved, setJoined])

  const isSaved = useCallback(
    (trialId: string) => savedTrialIds.includes(trialId),
    [savedTrialIds]
  )
  const toggleSave = useCallback(
    (trialId: string) => {
      const wasSaved = savedTrialIds.includes(trialId)
      // optimistic
      setSaved((prev) =>
        wasSaved ? prev.filter((id) => id !== trialId) : [...prev, trialId]
      )
      const request = wasSaved
        ? api.unsaveTrial(trialId)
        : api.saveTrial(trialId)
      request
        .then(() =>
          toast(
            wasSaved ? 'Removed from saved' : 'Saved to your profile',
            'success'
          )
        )
        .catch(() => {
          // revert
          setSaved((prev) =>
            wasSaved ? [...prev, trialId] : prev.filter((id) => id !== trialId)
          )
          toast('Couldn’t update saved trials', 'error')
        })
    },
    [savedTrialIds, setSaved, toast]
  )

  const isJoined = useCallback(
    (groupId: string) => joinedGroupIds.includes(groupId),
    [joinedGroupIds]
  )
  const toggleJoin = useCallback(
    (groupId: string, groupName?: string) => {
      const wasJoined = joinedGroupIds.includes(groupId)
      setJoined((prev) =>
        wasJoined ? prev.filter((id) => id !== groupId) : [...prev, groupId]
      )
      const request = wasJoined
        ? api.leaveGroup(groupId)
        : api.joinGroup(groupId)
      request
        .then(() =>
          toast(
            wasJoined
              ? `Left ${groupName ?? 'the community'}`
              : `Joined ${groupName ?? 'the community'}`,
            'success'
          )
        )
        .catch(() => {
          setJoined((prev) =>
            wasJoined ? [...prev, groupId] : prev.filter((id) => id !== groupId)
          )
          toast('Couldn’t update your communities', 'error')
        })
    },
    [joinedGroupIds, setJoined, toast]
  )

  const isOwn = useCallback(
    (authorId: string) => !!user && authorId === user.id,
    [user]
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
      isOwn,
      isAdmin,
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
      isOwn,
      isAdmin,
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
