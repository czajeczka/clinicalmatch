import { useEffect } from 'react'
import { useLocalState } from './useLocalState'

export type Theme = 'system' | 'light' | 'dark'

/**
 * Theme preference. 'system' follows prefers-color-scheme; light/dark stamp
 * data-theme on <html> to override it (see index.css dark-mode rules).
 */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useLocalState<Theme>(
    'clinicalmatch.theme',
    'system'
  )

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  return [theme, setTheme]
}
