import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export function SheetContent({
  className,
  children,
  side = 'end',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: 'start' | 'end' | 'left' | 'right'
}) {
  const logical =
    side === 'start' || side === 'left'
      ? 'inset-y-0 start-0 border-e'
      : 'inset-y-0 end-0 border-s'
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy/40" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex h-full w-[min(400px,100vw)] flex-col border-border bg-surface shadow-xl',
          logical,
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute end-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-10 rounded-md bg-bg/80 p-2 text-muted backdrop-blur hover:bg-bg">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-border p-5 pe-12', className)} {...props} />
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-base font-semibold text-navy', className)} {...props} />
}
