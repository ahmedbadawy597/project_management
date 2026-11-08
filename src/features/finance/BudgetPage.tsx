import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { KPICard } from '@/components/shared/KPICard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BudgetPanel } from './BudgetPanel'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { useAddTransaction } from '@/api/hooks'
import { useAuth } from '@/auth/AuthProvider'
import { getPortfolioKpis } from '@/data/selectors'
import { formatCurrency } from '@/lib/utils'

export function BudgetPage() {
  const { t } = useTranslation()
  const { state, isLoading, isError, refetch } = useDomain()
  const { can } = useAuth()
  const addTx = useAddTransaction()
  const [amount, setAmount] = useState('50000')
  const [projectId, setProjectId] = useState('prj-001')

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  const kpis = getPortfolioKpis(state)
  const forecast = Math.round(kpis.spent * 1.35)

  return (
    <div>
      <PageHeader
        title={t('budget.title')}
        description={t('budget.subtitle')}
        actions={
          can('budget:adjust') ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </select>
              <Input
                className="w-32"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button
                disabled={addTx.isPending}
                onClick={() => {
                  const value = Number(amount)
                  if (!Number.isFinite(value) || value === 0) return
                  addTx.mutate(
                    {
                      id: `tx-${Date.now()}`,
                      projectId,
                      date: new Date().toISOString().slice(0, 10),
                      category: 'Adjustment',
                      description: 'Director allocation adjustment',
                      amount: value,
                      type: 'adjustment',
                    },
                    {
                      onSuccess: () => toast.success(t('budget.adjust')),
                      onError: (e) => toast.error(e instanceof Error ? e.message : t('common.failed')),
                    },
                  )
                }}
              >
                {t('budget.adjust')}
              </Button>
            </div>
          ) : undefined
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KPICard label={t('budget.totalApproved')} value={formatCurrency(kpis.totalBudget)} />
        <KPICard label={t('budget.allocated')} value={formatCurrency(kpis.allocated)} tone="info" />
        <KPICard label={t('budget.expenses')} value={formatCurrency(kpis.spent)} tone="warning" />
        <KPICard label={t('budget.remaining')} value={formatCurrency(kpis.remaining)} tone="success" />
        <KPICard label={t('budget.variance')} value={formatCurrency(kpis.budgetVariance)} tone="teal" />
        <KPICard label={t('budget.forecastSpend')} value={formatCurrency(forecast)} tone="danger" />
      </div>
      <BudgetPanel />
    </div>
  )
}
