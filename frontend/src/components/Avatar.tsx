import { cn } from '@/lib/cn'

type Size = 'sm' | 'md' | 'lg'

const sizes: Record<Size, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
}

interface AvatarProps {
  initials: string
  /** Accent colour (hex/hsl). Defaults to the brand primary tint. */
  color?: string
  size?: Size
  /** Small green presence dot (member online). */
  online?: boolean
  className?: string
  title?: string
}

/** Circular initials avatar used across the community (members, moderators,
 *  profiles). Colour-tinted from the member's accent; decorative by default. */
export function Avatar({
  initials,
  color,
  size = 'md',
  online = false,
  className,
  title,
}: AvatarProps) {
  const style = color ? { backgroundColor: `${color}22`, color } : undefined
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        title={title}
        aria-hidden
        className={cn(
          'font-display grid place-items-center rounded-full font-semibold',
          !color && 'bg-primary/12 text-primary',
          sizes[size]
        )}
        style={style}
      >
        {initials}
      </span>
      {online && (
        <span
          className="border-surface bg-success absolute right-0 bottom-0 h-3 w-3 rounded-full border-2"
          aria-label="Online"
        />
      )}
    </span>
  )
}
