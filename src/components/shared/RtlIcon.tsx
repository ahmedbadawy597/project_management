import type { LucideIcon, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Mirrors directional icons in RTL (chevrons, back/forward arrows).
 * Do not wrap non-directional icons (search, bell, check, logos).
 */
export function RtlIcon({
  icon: Icon,
  className,
  mirror = true,
  ...props
}: LucideProps & { icon: LucideIcon; mirror?: boolean }) {
  return <Icon className={cn(mirror && 'rtl:-scale-x-100', className)} {...props} />
}
