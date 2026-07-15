import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from '@/components/IconButton'
import { BackIcon } from '@/components/icons'

interface HeaderProps {
  title: ReactNode
  /** Show a back button that pops the history stack. */
  back?: boolean
  actions?: ReactNode
  /** Use the serif display face for tab-level titles. */
  display?: boolean
  /**
   * Render the bar title as the page's `<h1>`. Set false on detail screens
   * whose body already owns the real `<h1>`, to avoid two h1s per page.
   */
  heading?: boolean
}

/** Sticky app bar. Detail screens pass `back`; tabs pass `display`. */
export function Header({
  title,
  back,
  actions,
  display = true,
  heading = true,
}: HeaderProps) {
  const navigate = useNavigate()
  const titleClass =
    (display ? 'font-display ' : '') +
    'text-text flex-1 truncate px-2 text-xl font-semibold'
  return (
    <header className="bg-bg/85 border-border sticky top-0 z-30 flex min-h-14 items-center gap-1 border-b px-2 backdrop-blur-md">
      {back && (
        <IconButton label="Go back" onClick={() => navigate(-1)}>
          <BackIcon className="h-5 w-5" />
        </IconButton>
      )}
      {heading ? (
        <h1 className={titleClass}>{title}</h1>
      ) : (
        <div className={titleClass}>{title}</div>
      )}
      {actions && <div className="flex items-center">{actions}</div>}
    </header>
  )
}
