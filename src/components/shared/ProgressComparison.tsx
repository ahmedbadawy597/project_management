import { Progress } from '@/components/ui/progress'
import { formatPercent } from '@/lib/utils'

export function ProgressComparison({
  planned,
  actual,
}: {
  planned: number
  actual: number
}) {
  const variance = actual - planned
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex justify-between text-xs">
          <span className="font-medium text-muted">Planned</span>
          <span className="font-semibold tabular-nums text-navy">{formatPercent(planned)}</span>
        </div>
        <Progress value={planned} indicatorClassName="bg-[#A8C4B4]" className="h-2.5" />
      </div>
      <div>
        <div className="mb-2 flex justify-between text-xs">
          <span className="font-medium text-muted">Actual</span>
          <span className="font-semibold tabular-nums text-navy">{formatPercent(actual)}</span>
        </div>
        <Progress
          value={actual}
          indicatorClassName={variance < 0 ? 'bg-danger' : 'bg-primary'}
          className="h-2.5"
        />
      </div>
      <div
        className={`inline-flex items-center rounded-xl px-2.5 py-1.5 text-xs font-semibold ${
          variance < 0 ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
        }`}
      >
        Schedule variance: {variance > 0 ? '+' : ''}
        {variance} pp
      </div>
    </div>
  )
}
