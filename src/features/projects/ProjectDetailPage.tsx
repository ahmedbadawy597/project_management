import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { HealthIndicator } from '@/components/shared/HealthIndicator'
import { ProgressComparison } from '@/components/shared/ProgressComparison'
import { KPICard } from '@/components/shared/KPICard'
import { ActivityFeed } from '@/components/shared/ActivityFeed'
import { ProjectGantt } from '@/components/gantt/ProjectGantt'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { enrichProject, personName } from '@/data/selectors'
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils'
import { EmptyState } from '@/components/shared/EmptyState'
import { FileText } from 'lucide-react'
import { TaskBoard } from '@/features/tasks/TaskBoard'
import { RiskPanel } from '@/features/risks/RiskPanel'
import { SlaTable } from '@/features/sla/SlaTable'
import { MilestoneTable } from '@/features/milestones/MilestoneTable'
import { BudgetPanel } from '@/features/finance/BudgetPanel'
import { ApprovalsPanel } from '@/features/approvals/ApprovalsPanel'

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const { t } = useTranslation()
  const { state, language, isLoading, isError, refetch } = useDomain()

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  const project = state.projects.find((p) => p.id === projectId)

  if (!project) {
    return (
      <EmptyState icon={FileText} title={t('project.notFound')} description={t('project.notFoundBody')} />
    )
  }

  const enriched = enrichProject(state, project)
  const team = state.people.filter((p) => p.projectIds.includes(project.id) || p.id === project.managerId)
  const docs = state.documents.filter((d) => d.projectId === project.id)
  const activities = state.activities.filter((a) => a.projectId === project.id).slice(0, 10)
  const upcoming = state.milestones.filter(
    (m) => m.projectId === project.id && m.status !== 'Completed' && m.status !== 'Accepted',
  )

  const tabs: Array<[string, string]> = [
    ['overview', t('project.tabOverview')],
    ['charter', t('project.tabCharter')],
    ['plan', t('project.tabPlan')],
    ['gantt', t('project.tabGantt')],
    ['wbs', t('project.tabWbs')],
    ['tasks', t('project.tabTasks')],
    ['milestones', t('project.tabMilestones')],
    ['team', t('project.tabTeam')],
    ['sla', t('project.tabSla')],
    ['risks', t('project.tabRisks')],
    ['budget', t('project.tabBudget')],
    ['documents', t('project.tabDocuments')],
    ['approvals', t('project.tabApprovals')],
    ['activity', t('project.tabActivity')],
  ]

  return (
    <div>
      <PageHeader
        title={language === 'ar' ? project.nameAr : project.name}
        description={`${project.code} · ${language === 'ar' ? project.descriptionAr : project.description}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/gantt?project=${project.id}`}>{t('project.openGantt')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/teams?project=${project.id}`}>{t('nav.teams')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/tickets?project=${project.id}`}>{t('nav.tickets')}</Link>
            </Button>
            <Button asChild>
              <Link to="/tasks">{t('project.manageTasks')}</Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={project.status} />
          <HealthIndicator health={enriched.health} />
          <span className="text-sm text-muted">
            {t('common.pm')}: {language === 'ar' ? enriched.managerNameAr : enriched.managerName}
          </span>
          <span className="text-sm text-muted">
            {t('common.phase')}: {project.phase}
          </span>
          <span className="text-sm text-muted">
            {formatDate(project.plannedStart)} → {formatDate(project.forecastEnd)}
          </span>
          <div className="ms-auto min-w-[160px]">
            <div className="mb-1 flex justify-between text-xs">
              <span>{t('common.progress')}</span>
              <span>{formatPercent(project.actualProgress)}</span>
            </div>
            <Progress value={project.actualProgress} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <div className="table-scroll edge-fade-x">
          <TabsList className="h-auto min-w-max flex-wrap">
            {tabs.map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard label={t('project.plannedProgress')} value={formatPercent(project.plannedProgress)} />
            <KPICard label={t('project.actualProgress')} value={formatPercent(project.actualProgress)} tone="teal" />
            <KPICard
              label={t('project.scheduleVariance')}
              value={`${enriched.scheduleVariance > 0 ? '+' : ''}${enriched.scheduleVariance} pp`}
              tone={enriched.scheduleVariance < 0 ? 'danger' : 'success'}
            />
            <KPICard label={t('project.spi')} value={enriched.spi.toFixed(2)} tone="info" />
            <KPICard label={t('project.forecastCompletion')} value={formatDate(project.forecastEnd)} />
            <KPICard
              label={t('project.budgetUtilization')}
              value={`${enriched.budgetUtilization}%`}
              hint={formatCurrency(project.budgetSpent)}
            />
            <KPICard label={t('project.openRisks')} value={enriched.openRisks} tone="warning" />
            <KPICard label={t('project.pendingApprovals')} value={enriched.pendingApprovals} tone="info" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(state.apps ?? []).filter((a) => a.projectId === project.id).length > 0 ? (
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('manage.appsInProject')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {(state.apps ?? [])
                    .filter((a) => a.projectId === project.id)
                    .map((app) => (
                      <Button key={app.id} variant="outline" size="sm" asChild>
                        <Link to={`/tickets?project=${project.id}&app=${app.id}`}>
                          {app.code} · {t('manage.openTickets')}
                        </Link>
                      </Button>
                    ))}
                </CardContent>
              </Card>
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle>{t('project.progressComparison')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressComparison planned={project.plannedProgress} actual={project.actualProgress} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('project.upcomingMilestones')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcoming.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                    <span>{language === 'ar' ? m.nameAr : m.name}</span>
                    <span className="text-xs text-muted">{formatDate(m.forecastDate)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('project.summary')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted">
                {language === 'ar' ? project.summaryAr : project.summary}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('project.managerUpdate')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted">
                {language === 'ar' ? project.managerUpdateAr : project.managerUpdate}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charter">
          <Card>
            <CardHeader>
              <CardTitle>{t('project.charter')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted">
              <p>{language === 'ar' ? project.charterAr : project.charter}</p>
              <p>
                <strong className="text-navy">{t('common.manager')}:</strong>{' '}
                {language === 'ar' ? enriched.managerNameAr : enriched.managerName}
              </p>
              <p>
                <strong className="text-navy">{t('project.window')}:</strong> {formatDate(project.plannedStart)} –{' '}
                {formatDate(project.plannedEnd)}
              </p>
              <p>
                <strong className="text-navy">{t('project.approvedBudget')}:</strong>{' '}
                {formatCurrency(project.budgetApproved)}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan">
          <Card>
            <CardHeader>
              <CardTitle>{t('project.planOverview')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.wbs
                .filter((w) => w.projectId === project.id && w.type === 'phase')
                .map((phase) => (
                  <div key={phase.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-navy">{language === 'ar' ? phase.nameAr : phase.name}</p>
                      <StatusBadge status={phase.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(phase.start)} → {formatDate(phase.end)} · {formatPercent(phase.progress)}
                    </p>
                    <Progress className="mt-2" value={phase.progress} />
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt">
          <ProjectGantt projectId={project.id} />
        </TabsContent>

        <TabsContent value="wbs">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-bg text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-start">{t('common.wbs')}</th>
                  <th className="px-3 py-2 text-start">{t('common.type')}</th>
                  <th className="px-3 py-2 text-start">{t('common.dates')}</th>
                  <th className="px-3 py-2 text-start">{t('common.progress')}</th>
                  <th className="px-3 py-2 text-start">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {state.wbs
                  .filter((w) => w.projectId === project.id)
                  .map((w) => (
                    <tr key={w.id} className="border-t border-border">
                      <td className="px-3 py-2" style={{ paddingInlineStart: w.parentId ? 24 : 12 }}>
                        {language === 'ar' ? w.nameAr : w.name}
                        {w.critical ? <span className="ms-2 text-[10px] text-danger">CP</span> : null}
                      </td>
                      <td className="px-3 py-2">{w.type}</td>
                      <td className="px-3 py-2 text-xs">
                        {formatDate(w.start)} → {formatDate(w.end)}
                      </td>
                      <td className="px-3 py-2">{formatPercent(w.progress)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={w.status} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <TaskBoard projectId={project.id} />
        </TabsContent>

        <TabsContent value="milestones">
          <MilestoneTable projectId={project.id} />
        </TabsContent>

        <TabsContent value="team">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <p className="font-medium text-navy">{language === 'ar' ? member.nameAr : member.name}</p>
                  <p className="text-xs text-muted">{member.role}</p>
                  <p className="mt-2 text-xs text-muted">{member.email}</p>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{t('common.allocation')}</span>
                      <span className={member.allocation > 100 ? 'text-danger' : ''}>{member.allocation}%</span>
                    </div>
                    <Progress
                      value={Math.min(member.allocation, 100)}
                      indicatorClassName={member.allocation > 100 ? 'bg-danger' : undefined}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sla">
          <SlaTable projectId={project.id} />
        </TabsContent>

        <TabsContent value="risks">
          <RiskPanel projectId={project.id} />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetPanel projectId={project.id} />
        </TabsContent>

        <TabsContent value="documents">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-bg text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-start">{t('common.document')}</th>
                  <th className="px-3 py-2 text-start">{t('common.category')}</th>
                  <th className="px-3 py-2 text-start">{t('common.upload')}</th>
                  <th className="px-3 py-2 text-start">{t('common.size')}</th>
                  <th className="px-3 py-2 text-start">{t('common.version')}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-navy">{d.name}</td>
                    <td className="px-3 py-2">{d.category}</td>
                    <td className="px-3 py-2">
                      {formatDate(d.uploadedAt)} · {personName(state, d.uploadedBy, language)}
                    </td>
                    <td className="px-3 py-2">{d.size}</td>
                    <td className="px-3 py-2">{d.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalsPanel projectId={project.id} />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>{t('executive.activity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={activities} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
