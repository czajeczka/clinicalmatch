import { useCallback, useState } from 'react'

interface AiActionState<T, A extends unknown[]> {
  data: T | null
  loading: boolean
  error: boolean
  run: (...args: A) => Promise<void>
  reset: () => void
}

/**
 * Runs an AI call with the brief's failure policy: on error, retry once
 * automatically, then surface a calm error the caller renders as a fallback.
 * Never throws to the component; the rest of the app keeps working.
 */
export function useAiAction<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>
): AiActionState<T, A> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const run = useCallback(
    async (...args: A) => {
      setLoading(true)
      setError(false)
      try {
        const result = await fn(...args)
        setData(result)
      } catch {
        // retry once
        try {
          const result = await fn(...args)
          setData(result)
        } catch {
          setError(true)
        }
      } finally {
        setLoading(false)
      }
    },
    [fn]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(false)
    setLoading(false)
  }, [])

  return { data, loading, error, run, reset }
}
