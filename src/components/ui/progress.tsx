import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

export function Progress({
  value,
  className,
  indicatorClassName,
}: {
  value: number
  className?: string
  indicatorClassName?: string
}) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        'relative h-2.5 w-full overflow-hidden rounded-full bg-bg shadow-[inset_2px_2px_4px_#D9D3BF,inset_-2px_-2px_4px_#FFFFFF]',
        className,
      )}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full origin-left rounded-full bg-primary transition-all duration-700 ease-out',
          indicatorClassName,
        )}
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          transformOrigin: 'left',
          animation: 'progress-grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      />
    </ProgressPrimitive.Root>
  )
}
