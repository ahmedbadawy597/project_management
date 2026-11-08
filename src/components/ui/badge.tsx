import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide border transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-bg text-text border-border',
        success: 'bg-success/10 text-success border-success/20',
        warning: 'bg-warning/10 text-warning border-warning/25',
        danger: 'bg-danger/10 text-danger border-danger/20',
        info: 'bg-royal/10 text-royal border-royal/20',
        navy: 'bg-navy/10 text-navy border-navy/15',
        teal: 'bg-teal/10 text-teal border-teal/20',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
