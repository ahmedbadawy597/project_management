import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white shadow-[4px_4px_10px_#D9D3BF] hover:bg-primary/90',
        secondary: 'bg-primary-light text-white shadow-[4px_4px_10px_#D9D3BF] hover:bg-primary-light/90',
        outline:
          'border-0 bg-bg text-navy shadow-[4px_4px_10px_#D9D3BF,-4px_-4px_10px_#FFFFFF] hover:text-primary',
        ghost: 'hover:bg-white/40 text-navy',
        danger: 'bg-danger text-white hover:bg-danger/90',
        teal: 'bg-teal text-white shadow-[4px_4px_10px_#D9D3BF] hover:bg-teal/90',
      },
      size: {
        default: 'min-h-11 h-11 px-4 py-2',
        sm: 'min-h-10 h-10 rounded-xl px-3 text-xs',
        lg: 'min-h-11 h-11 rounded-2xl px-6',
        icon: 'min-h-11 min-w-11 h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'
