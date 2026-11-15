import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Wrap LTR-only values (URL, email, ID, code) so cursor/typing stay correct in RTL layouts. */
export function LtrField({
  className,
  children,
  as: Tag = 'span',
}: {
  className?: string
  children: ReactNode
  as?: 'span' | 'div' | 'bdi'
}) {
  return (
    <Tag dir="ltr" className={cn('inline-block text-end tabular-nums', className)}>
      {children}
    </Tag>
  )
}
