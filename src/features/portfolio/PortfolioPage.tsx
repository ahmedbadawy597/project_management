import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/auth/AuthProvider'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { Download, LayoutGrid, List } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { HealthIndicator } from '@/components/shared/HealthIndicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useDomain } from '@/api/useDomain'
import { enrichProject, type EnrichedProject } from '@/data/selectors'
import { cn, exportToCsv, formatDate, formatPercent } from '@/lib/utils'
import { PageError, PageSkeleton } from '@/components/shared/PageStates'

const QUICK = ['All', 'Active', 'Planned', 'On Track', 'At Risk', 'Delayed', 'Completed'] as const

export function PortfolioPage() {
  const { t } = useTranslation()
  const { can } = useAuth()
  const { state, language, isLoading, isError, refetch } = useDomain()
  const [quick, setQuick] = useState<(typeof QUICK)[number]>('All')
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [savedFilter, setSavedFilter] = useState('')
  const canManage = can('projects:write')

  const data = useMemo(() => {
    if (canManage) return [] as EnrichedProject[]
    if (!state) return []
    let rows = state.projects.map((p) => enrichProject(state, p))
    if (quick === 'Active' || quick === 'Planned' || quick === 'Completed') {
      rows = rows.filter((r) => r.status === quick)
    } else if (quick === 'On Track' || quick === 'At Risk' || quick === 'Delayed') {
      rows = rows.filter((r) => r.health === quick)
    }
    return rows
  }, [state, quick, canManage])

  const quickLabel = (q: (typeof QUICK)[number]) => {
    const map: Record<(typeof QUICK)[number], string> = {
      All: t('common.all'),
      Active: t('common.active'),
      Planned: t('common.planned'),
      'On Track': t('common.onTrack'),
      'At Risk': t('common.atRisk'),
      Delayed: t('common.delayed'),
      Completed: t('common.completed'),
    }
    return map[q]
  }

  const columns = useMemo<ColumnDef<EnrichedProject>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('common.code'),
        cell: ({ row }) => (
          <Link className="font-medium text-royal hover:underline" to={`/projects/${row.original.id}`}>
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'name',
        header: t('common.project'),
        cell: ({ row }) => (language === 'ar' ? row.original.nameAr : row.original.name),
      },
      {
        accessorKey: 'managerName',
        header: t('common.manager'),
        cell: ({ row }) => (language === 'ar' ? row.original.managerNameAr : row.original.managerName),
      },
      {
        accessorKey: 'status',
        header: t('common.status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'health',
        header: t('common.health'),
        cell: ({ row }) => <HealthIndicator health={row.original.health} />,
      },
      {
        accessorKey: 'plannedProgress',
        header: t('common.planned'),
        cell: ({ row }) => formatPercent(row.original.plannedProgress),
      },
      {
        accessorKey: 'actualProgress',
        header: t('common.actual'),
        cell: ({ row }) => (
          <div className="min-w-[100px]">
            <div className="mb-1 text-xs">{formatPercent(row.original.actualProgress)}</div>
            <Progress value={row.original.actualProgress} />
          </div>
        ),
      },
      {
        accessorKey: 'scheduleVariance',
        header: t('common.variance'),
        cell: ({ row }) => {
          const v = row.original.scheduleVariance
          return (
            <span className={v < 0 ? 'text-danger' : 'text-success'}>
              {v > 0 ? '+' : ''}
              {v} pp
            </span>
          )
        },
      },
      { accessorKey: 'spi', header: 'SPI', cell: ({ row }) => row.original.spi.toFixed(2) },
      {
        accessorKey: 'slaCompliance',
        header: 'SLA',
        cell: ({ row }) => formatPercent(row.original.slaCompliance),
      },
      {
        accessorKey: 'plannedStart',
        header: t('common.start'),
        cell: ({ row }) => formatDate(row.original.plannedStart),
      },
      {
        accessorKey: 'forecastEnd',
        header: t('common.forecast'),
        cell: ({ row }) => formatDate(row.original.forecastEnd),
      },
      {
        accessorKey: 'riskLevel',
        header: t('common.risk'),
        cell: ({ row }) => <StatusBadge status={row.original.riskLevel} />,
      },
    ],
    [language, t],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  })

  if (isLoading || !state) {
    return (
      <div>
        <PageHeader title={t('portfolio.title')} description={t('portfolio.subtitle')} />
        <PageSkeleton rows={6} />
      </div>
    )
  }
  if (isError) return <PageError onRetry={() => void refetch()} />

  const applySaved = (name: string) => {
    setSavedFilter(name)
    localStorage.setItem('awqaf-saved-filter', name)
    if (name === 'Active On Track') setQuick('On Track')
    if (name === 'Delayed Only') setQuick('Delayed')
    if (name === 'Planned Pipeline') setQuick('Planned')
  }

  if (canManage) {
    return <Navigate to="/manage" replace />
  }

  return (
    <div>
      <PageHeader
        title={t('portfolio.title')}
        description={t('portfolio.subtitle')}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCsv(
                  'awqaf-portfolio.csv',
                  data.map((r) => ({
                    code: r.code,
                    name: r.name,
                    manager: r.managerName,
                    status: r.status,
                    health: r.health,
                    planned: r.plannedProgress,
                    actual: r.actualProgress,
                    variance: r.scheduleVariance,
                    spi: r.spi,
                    sla: r.slaCompliance,
                    start: r.plannedStart,
                    forecast: r.forecastEnd,
                    risk: r.riskLevel,
                  })),
                )
              }
            >
              <Download className="h-4 w-4" />
              {t('common.exportCsv')}
            </Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setView('table')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={view === 'cards' ? 'default' : 'outline'} size="icon" onClick={() => setView('cards')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setQuick(q)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                quick === q
                  ? 'border-transparent bg-primary text-white shadow-[4px_4px_10px_#D9D3BF]'
                  : 'border-transparent bg-bg text-muted shadow-[4px_4px_10px_#D9D3BF,-4px_-4px_10px_#FFFFFF] hover:text-navy',
              )}
            >
              {quickLabel(q)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            className="w-full sm:w-56"
            placeholder={t('common.search')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          <select
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
            value={savedFilter}
            onChange={(e) => applySaved(e.target.value)}
          >
            <option value="">{t('common.savedFilters')}</option>
            <option value="Active On Track">{t('common.filterActiveOnTrack')}</option>
            <option value="Delayed Only">{t('common.filterDelayedOnly')}</option>
            <option value="Planned Pipeline">{t('common.filterPlannedPipeline')}</option>
          </select>
          <details className="relative">
            <summary className="flex h-9 cursor-pointer list-none items-center rounded-md border border-border bg-surface px-3 text-sm">
              {t('common.columns')}
            </summary>
            <div className="absolute end-0 z-20 mt-1 w-48 rounded-md border border-border bg-surface p-2 shadow-lg">
              {table.getAllLeafColumns().map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-1 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                  />
                  {String(col.columnDef.header)}
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      {view === 'table' ? (
        <div className="neo overflow-hidden animate-fade-up">
          <div className="table-scroll edge-fade-x">
            <table className="data-table w-full min-w-[880px] text-sm lg:min-w-[1100px]">
              <thead className="bg-bg/70 text-start">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="cursor-pointer px-3 py-3.5 transition-colors hover:text-navy"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? null}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/80">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-3.5 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted">
            <span>
              {t('common.page')} {table.getState().pagination.pageIndex + 1} {t('common.of')} {table.getPageCount()}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
                {t('common.prev')}
              </Button>
              <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
                {t('common.next')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="neo block p-4 transition hover:-translate-y-0.5"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted" dir="ltr">
                    {p.code}
                  </p>
                  <h3 className="text-sm font-semibold text-navy">{language === 'ar' ? p.nameAr : p.name}</h3>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <HealthIndicator health={p.health} />
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>{t('common.actual')}</span>
                  <span>{formatPercent(p.actualProgress)}</span>
                </div>
                <Progress value={p.actualProgress} />
              </div>
              <p className="mt-3 text-xs text-muted">
                {language === 'ar' ? p.managerNameAr : p.managerName} · SPI {p.spi.toFixed(2)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
