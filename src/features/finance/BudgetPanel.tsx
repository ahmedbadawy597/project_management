import { useTranslation } from 'react-i18next'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function BudgetPanel({ projectId }: { projectId?: string }) {
  const { t, i18n } = useTranslation()
  const { state, isLoading, isError, refetch } = useDomain()

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  const projects = state.projects.filter((p) => (projectId ? p.id === projectId : true))
  const txs = state.transactions.filter((tx) => (projectId ? tx.projectId === projectId : true))

  const monthKeys = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'] as const
  const monthLabels =
    i18n.language === 'ar'
      ? ['يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر']
      : [...monthKeys]
  const monthly = monthKeys.map((month, idx) => {
    const map = ['06', '07', '08', '09', '10', '11']
    const spent = txs
      .filter((tx) => tx.type === 'expense' && tx.date.slice(5, 7) === map[idx])
      .reduce((s, tx) => s + tx.amount, 0)
    return { month: monthLabels[idx] ?? month, spent }
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('budget.byProject')}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projects.map((p) => ({
                  name: p.code.replace('AWQ-APP-', ''),
                  approved: p.budgetApproved,
                  spent: p.budgetSpent,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="approved" fill="#4B73C8" />
                <Bar dataKey="spent" fill="#D99A32" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('budget.monthlyTrend')}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="spent" stroke="#3159A5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-start">{t('common.date')}</th>
              <th className="px-3 py-2 text-start">{t('common.project')}</th>
              <th className="px-3 py-2 text-start">{t('common.category')}</th>
              <th className="px-3 py-2 text-start">{t('common.description')}</th>
              <th className="px-3 py-2 text-start">{t('common.type')}</th>
              <th className="px-3 py-2 text-start">{t('common.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id} className="border-t border-border">
                <td className="px-3 py-2">{formatDate(tx.date)}</td>
                <td className="px-3 py-2">{state.projects.find((p) => p.id === tx.projectId)?.code}</td>
                <td className="px-3 py-2">{tx.category}</td>
                <td className="px-3 py-2">{tx.description}</td>
                <td className="px-3 py-2">{tx.type}</td>
                <td className="px-3 py-2 font-medium">{formatCurrency(tx.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
