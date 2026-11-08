import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ChartCard({
  title,
  description,
  children,
  className,
  action,
  delay = 0,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  delay?: number
}) {
  return (
    <Card
      className={cn('overflow-hidden animate-fade-up', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-[15px] font-bold tracking-tight">{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="h-[280px] pt-1">{children}</CardContent>
    </Card>
  )
}
