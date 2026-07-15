import type { ReactNode } from 'react'
import type { SupportGroup } from '@/types'
import { coverGradient } from '@/lib/community'
import { cn } from '@/lib/cn'

interface CommunityCoverProps {
  group: SupportGroup
  className?: string
  children?: ReactNode
}

/** Gradient community cover banner derived from the community's accent colour,
 *  with a soft dotted texture. Reused on community cards and the board header. */
export function CommunityCover({
  group,
  className,
  children,
}: CommunityCoverProps) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ backgroundImage: coverGradient(group) }}
      aria-hidden={children ? undefined : true}
    >
      {/* subtle texture + depth */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
          backgroundSize: '14px 14px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      {children}
    </div>
  )
}
