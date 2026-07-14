import { useCallback, useEffect, useState } from 'react'

/** useState that persists to localStorage under `key`. */
export function useLocalState<T>(
  key: string,
  initial: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* ignore quota/serialisation errors in this mock phase */
    }
  }, [key, state])

  const set = useCallback((value: T | ((prev: T) => T)) => setState(value), [])

  return [state, set]
}
