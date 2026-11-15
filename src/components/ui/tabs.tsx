import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <div className="tabs-scroll sticky top-0 z-[15] -mx-1 px-1 pb-1">
      <TabsPrimitive.List
        className={cn(
          'inline-flex h-11 min-w-full items-center gap-1 rounded-lg border border-border bg-bg/95 p-1 backdrop-blur-sm sm:min-w-0',
          className,
        )}
        {...props}
      />
    </div>
  )
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted transition-all data-[state=active]:bg-surface data-[state=active]:text-navy data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-4 focus-visible:outline-none', className)} {...props} />
}
