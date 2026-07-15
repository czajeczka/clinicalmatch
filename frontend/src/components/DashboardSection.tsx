import type { ReactNode } from 'react'

/** A dashboard section: a heading with an optional right-aligned action link,
 *  then its content. Keeps the dashboard visually consistent (Linear/Notion
 *  style section blocks). */
export function DashboardSection({
  title,
  action,
  children,
}: {
  title: string
  action?: { label: string; onClick: () => void }
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-text text-lg font-semibold">
          {title}
        </h2>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-primary rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}
