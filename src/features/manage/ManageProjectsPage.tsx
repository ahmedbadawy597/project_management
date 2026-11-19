import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AppWindow,
  ArrowUpRight,
  LayoutGrid,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { ProjectPackActions } from './ProjectPackActions'
import { useImportSetupStore } from '@/data/import-setup-store'
import { useAuth } from '@/auth/AuthProvider'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { HealthIndicator } from '@/components/shared/HealthIndicator'
import { KPICard } from '@/components/shared/KPICard'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { useDeleteProject } from '@/api/hooks'
import { useDomain } from '@/api/useDomain'
import { useAccessScope } from '@/hooks/useAccessScope'
import { enrichProject } from '@/data/selectors'
import { cn, formatPercent } from '@/lib/utils'
import { LtrField } from '@/components/shared/LtrField'

const STATUS_FILTERS = ['All', 'Active', 'Planned', 'Completed', 'On Hold'] as const

export function ManageProjectsPage() {
  const { t } = useTranslation()
  const { can } = useAuth()
  const { isScoped } = useAccessScope()
  const { state, language, isLoading, isError, refetch } = useDomain()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const canWrite = can('projects:write')
  const pendingSetups = useImportSetupStore((s) => s.pending)
  const isSetupPending = useImportSetupStore((s) => s.isPending)
  const clearPendingSetup = useImportSetupStore((s) => s.clearPending)
  const deleteProject = useDeleteProject()

  const rows = useMemo(() => {
    if (!state) return []
    return state.projects.map((p) => enrichProject(state, p))
  }, [state])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (status !== 'All' && row.status !== status) return false
      if (!q) return true
      const name = language === 'ar' ? row.nameAr : row.name
      const manager = language === 'ar' ? row.managerNameAr : row.managerName
      return (
        row.code.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        (manager ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, query, status, language])

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />

  const apps = state.apps ?? []
  const activeCount = rows.filter((r) => r.status === 'Active').length
  const unassigned = rows.filter((r) => !r.managerId).length

  const statusLabel = (s: (typeof STATUS_FILTERS)[number]) => {
    if (s === 'All') return t('common.all')
    if (s === 'On Hold') return t('status.On Hold', { defaultValue: s })
    return t(`common.${s === 'Active' ? 'active' : s === 'Planned' ? 'planned' : 'completed'}`, {
      defaultValue: s,
    })
  }

  return (
    <div className="page-enter">
      <PageHeader
        title={t('manage.title')}
        description={t(isScoped ? 'manage.subtitleJoined' : 'manage.subtitle')}
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {!isScoped ? (
              <>
                <Button variant="outline" asChild className="min-h-11">
                  <Link to="/teams">
                    <Users className="me-1.5 h-4 w-4" />
                    {t('manage.quickTeams')}
                  </Link>
                </Button>
                <Button variant="outline" asChild className="min-h-11">
                  <Link to="/apps-catalog">
                    <AppWindow className="me-1.5 h-4 w-4" />
                    {t('manage.quickApps')}
                  </Link>
                </Button>
                <Button asChild className="min-h-11">
                  <Link to="/manage/projects/new">
                    <Plus className="me-1.5 h-4 w-4" />
                    {t('manage.newProject')}
                  </Link>
                </Button>
              </>
            ) : (
              <Button variant="outline" asChild className="min-h-11">
                <Link to="/apps-catalog">
                  <AppWindow className="me-1.5 h-4 w-4" />
                  {t('manage.quickApps')}
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="kpi-grid-4 mb-6">
        <KPICard label={t('manage.totalProjects')} value={rows.length} icon={LayoutGrid} featured />
        <KPICard label={t('manage.activeProjects')} value={activeCount} tone="teal" />
        <KPICard label={t('manage.totalApps')} value={apps.length} tone="info" />
        <KPICard
          label={t('manage.unassigned')}
          value={unassigned}
          tone={unassigned > 0 ? 'warning' : 'success'}
        />
      </div>

      {canWrite && pendingSetups.length > 0 ? (
        <Card className="mb-6 border-teal/30 bg-teal/5">
          <CardContent className="space-y-3 py-4">
            <h2 className="text-sm font-bold text-navy">{t('importSetup.pendingTitle')}</h2>
            <p className="text-xs text-muted">{t('importSetup.pendingBody')}</p>
            <div className="flex flex-wrap gap-2">
              {pendingSetups.map((p) => (
                <Button key={p.projectId} asChild variant="outline" className="min-h-10">
                  <Link to={`/manage/projects/${p.projectId}/setup`}>
                    {t('importSetup.continue', { code: p.projectCode })}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {canWrite && !isScoped ? (
        <Card className="mb-6">
          <CardContent className="space-y-2 py-4">
            <h2 className="text-sm font-bold text-navy">{t('manage.packTitle')}</h2>
            <ProjectPackActions />
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="h-11 ps-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('manage.searchPlaceholder')}
            aria-label={t('common.search')}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'min-h-10 rounded-xl px-3 text-xs font-semibold transition-colors',
                status === s
                  ? 'bg-primary text-white shadow-[4px_4px_10px_#D9D3BF]'
                  : 'bg-bg text-muted shadow-[4px_4px_10px_#D9D3BF,-4px_-4px_10px_#FFFFFF] hover:text-navy',
              )}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={LayoutGrid}
              title={t('manage.emptyTitle')}
              description={t('manage.emptyBody')}
            />
            <div className="mt-4 flex justify-center">
              <Button asChild>
                <Link to="/manage/projects/new">
                  <Plus className="me-1.5 h-4 w-4" />
                  {t('manage.newProject')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((row, index) => {
            const projectApps = apps.filter((a) => a.projectId === row.id)
            const manager =
              language === 'ar' ? row.managerNameAr || row.managerName : row.managerName
            const title = language === 'ar' ? row.nameAr : row.name

            return (
              <article
                key={row.id}
                className="neo cv-auto p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <LtrField className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {row.code}
                      </LtrField>
                      <StatusBadge status={row.status} />
                      <HealthIndicator health={row.health} />
                    </div>
                    <h2 className="text-base font-bold text-navy sm:text-lg">{title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {t('manage.manager')}:{' '}
                      <span className="font-medium text-navy">
                        {manager || t('manage.noManager')}
                      </span>
                      <span className="mx-2 text-border">·</span>
                      {t('manage.appsCount', { count: projectApps.length })}
                    </p>
                    <p className="mt-1 text-xs text-muted">{t('manage.membersHint')}</p>

                    <div className="mt-3 max-w-sm">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
                        <span>{t('manage.progress')}</span>
                        <span className="tabular-nums text-navy">
                          {formatPercent(row.actualProgress)}
                        </span>
                      </div>
                      <Progress value={Math.min(100, Math.max(0, row.actualProgress))} />
                    </div>

                    {projectApps.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {projectApps.slice(0, 4).map((app) => (
                          <Link
                            key={app.id}
                            to={`/apps/${app.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-bg/70 px-2.5 py-1.5 text-xs font-medium text-navy hover:border-primary/40 hover:text-primary"
                          >
                            <span
                              className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                              style={{ backgroundColor: app.iconColor || '#1F6B47' }}
                            >
                              {(language === 'ar' ? app.nameAr : app.name).slice(0, 1)}
                            </span>
                            <span className="max-w-[9rem] truncate">
                              {language === 'ar' ? app.nameAr : app.name}
                            </span>
                          </Link>
                        ))}
                        {projectApps.length > 4 ? (
                          <span className="self-center text-[11px] text-muted">
                            +{projectApps.length - 4}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto lg:min-w-[220px]">
                    <Button asChild variant="outline" className="min-h-11 w-full border-teal/40 text-teal">
                      <Link to={`/manage/projects/${row.id}/setup`}>
                        {isSetupPending(row.id)
                          ? t('importSetup.continue', { code: row.code })
                          : t('importSetup.reviewPlan')}
                      </Link>
                    </Button>
                    <Button asChild className="min-h-11 w-full">
                      <Link to={`/manage/projects/${row.id}`}>
                        <Settings2 className="me-1.5 h-4 w-4" />
                        {t('manage.manageAll')}
                      </Link>
                    </Button>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                      <Button variant="outline" size="sm" className="min-h-10" asChild>
                        <Link to={`/projects/${row.id}`}>
                          <ArrowUpRight className="me-1 h-3.5 w-3.5" />
                          {t('manage.openProject')}
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="min-h-10" asChild>
                        <Link to={`/manage/projects/${row.id}?tab=team`}>
                          <Users className="me-1 h-3.5 w-3.5" />
                          {t('manage.manageTeam')}
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="min-h-10" asChild>
                        <Link to={`/manage/projects/${row.id}?tab=apps`}>
                          <AppWindow className="me-1 h-3.5 w-3.5" />
                          {t('manage.manageApps')}
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="min-h-10" asChild>
                        <Link to={`/tickets?project=${row.id}`}>
                          <MessageSquare className="me-1 h-3.5 w-3.5" />
                          {t('manage.manageTickets')}
                        </Link>
                      </Button>
                    </div>
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-10 w-full border-danger/30 text-danger hover:bg-danger/5"
                        onClick={() => setDeleteId(row.id)}
                      >
                        <Trash2 className="me-1 h-3.5 w-3.5" />
                        {t('manage.deleteProject')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        tone="danger"
        title={t('manage.deleteProjectTitle')}
        description={t('manage.deleteProjectBody', {
          code: rows.find((r) => r.id === deleteId)?.code ?? '',
          apps: apps.filter((a) => a.projectId === deleteId).length,
        })}
        confirmLabel={t('manage.deleteProjectConfirm')}
        cancelLabel={t('common.cancel')}
        busy={deleteProject.isPending}
        onConfirm={() => {
          if (!deleteId) return
          const id = deleteId
          void deleteProject
            .mutateAsync(id)
            .then(() => {
              clearPendingSetup(id)
              setDeleteId(null)
              toast.success(t('manage.deleteProjectOk'))
            })
            .catch(() => {
              toast.error(t('manage.deleteProjectFailed'))
            })
        }}
      />
    </div>
  )
}
