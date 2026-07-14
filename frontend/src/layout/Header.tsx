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
}

/** Sticky app bar. Detail screens pass `back`; tabs pass `display`. */
export function Header({ title, back, actions, display = true }: HeaderProps) {
  const navigate = useNavigate()
  return (
    <header className="bg-bg/85 border-border sticky top-0 z-30 flex min-h-14 items-center gap-1 border-b px-2 backdrop-blur-md">
      {back && (
        <IconButton label="Go back" onClick={() => navigate(-1)}>
          <BackIcon className="h-5 w-5" />
        </IconButton>
      )}
      <h1
        className={
          (display ? 'font-display ' : '') +
          'text-text flex-1 truncate px-2 text-xl font-semibold'
        }
      >
        {title}
      </h1>
      {actions && <div className="flex items-center">{actions}</div>}
    </header>
  )
}
