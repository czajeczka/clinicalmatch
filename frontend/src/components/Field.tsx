import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const controlBase =
  'w-full rounded-[var(--radius-control)] border bg-surface px-3 py-2.5 text-[15px] text-text ' +
  'placeholder:text-text-muted/70 transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-focus)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-text mb-1.5 block text-sm font-medium"
    >
      {children}
      {required && (
        <span className="text-danger ml-0.5" aria-hidden>
          *
        </span>
      )}
    </label>
  )
}

function Help({
  id,
  error,
  help,
}: {
  id: string
  error?: string
  help?: string
}) {
  if (error) {
    return (
      <p id={id} className="text-danger mt-1 text-sm" role="alert">
        {error}
      </p>
    )
  }
  if (help) {
    return (
      <p id={id} className="text-text-muted mt-1 text-sm">
        {help}
      </p>
    )
  }
  return null
}

interface BaseFieldProps {
  label?: string
  help?: string
  error?: string
  required?: boolean
}

export function Input({
  label,
  help,
  error,
  required,
  id,
  className,
  ...props
}: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const fieldId = id ?? auto
  const helpId = `${fieldId}-help`
  return (
    <div>
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}
      <input
        id={fieldId}
        aria-invalid={!!error || undefined}
        aria-describedby={error || help ? helpId : undefined}
        className={cn(
          controlBase,
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      />
      <Help id={helpId} error={error} help={help} />
    </div>
  )
}

export function Textarea({
  label,
  help,
  error,
  required,
  id,
  className,
  ...props
}: BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId()
  const fieldId = id ?? auto
  const helpId = `${fieldId}-help`
  return (
    <div>
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}
      <textarea
        id={fieldId}
        aria-invalid={!!error || undefined}
        aria-describedby={error || help ? helpId : undefined}
        className={cn(
          controlBase,
          'min-h-24 resize-y',
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      />
      <Help id={helpId} error={error} help={help} />
    </div>
  )
}

export function Select({
  label,
  help,
  error,
  required,
  id,
  className,
  children,
  ...props
}: BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId()
  const fieldId = id ?? auto
  const helpId = `${fieldId}-help`
  return (
    <div>
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}
      <select
        id={fieldId}
        aria-invalid={!!error || undefined}
        aria-describedby={error || help ? helpId : undefined}
        className={cn(
          controlBase,
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <Help id={helpId} error={error} help={help} />
    </div>
  )
}
