import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useDomain } from '@/api/useDomain'
import {
  useCreateProject,
  useDeleteApp,
  useUpdateProject,
  useUpsertApp,
} from '@/api/hooks'
import type { ProjectApp, ProjectAppStatus, ProjectStatus, RiskLevel } from '@/data/types'

const PROJECT_STATUSES: ProjectStatus[] = ['Planned', 'Active', 'On Hold', 'Completed']
const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical']
const APP_STATUSES: ProjectAppStatus[] = ['Planned', 'Active', 'On Hold', 'Completed']

type FormState = {
  code: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  managerId: string
  status: ProjectStatus
  plannedStart: string
  plannedEnd: string
  phase: string
  budgetApproved: string
  riskLevel: RiskLevel
  charter: string
  charterAr: string
}

const emptyForm: FormState = {
  code: '',
  name: '',
  nameAr: '',
  description: '',
  descriptionAr: '',
  managerId: '',
  status: 'Planned',
  plannedStart: '',
  plannedEnd: '',
  phase: 'Initiation',
  budgetApproved: '0',
  riskLevel: 'Low',
  charter: '',
  charterAr: '',
}

export function ManageProjectFormPage() {
  const { projectId } = useParams()
  const isNew = !projectId || projectId === 'new'
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state, language, isLoading, isError, refetch } = useDomain()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const upsertApp = useUpsertApp()
  const deleteApp = useDeleteApp()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [appDraft, setAppDraft] = useState({
    code: '',
    name: '',
    nameAr: '',
    description: '',
    ownerId: '',
    status: 'Planned' as ProjectAppStatus,
    plannedStart: '',
    plannedEnd: '',
  })
  const [deleteAppId, setDeleteAppId] = useState<string | null>(null)

  const project = useMemo(
    () => (isNew || !state ? null : state.projects.find((p) => p.id === projectId) ?? null),
    [isNew, state, projectId],
  )

  const managers = useMemo(
    () => (state?.people ?? []).filter((p) => p.role === 'Project Manager'),
    [state],
  )

  const apps = useMemo(
    () => (state?.apps ?? []).filter((a) => a.projectId === projectId),
    [state, projectId],
  )

  useEffect(() => {
    if (!project) return
    setForm({
      code: project.code,
      name: project.name,
      nameAr: project.nameAr,
      description: project.description,
      descriptionAr: project.descriptionAr,
      managerId: project.managerId,
      status: project.status,
      plannedStart: project.plannedStart,
      plannedEnd: project.plannedEnd,
      phase: project.phase,
      budgetApproved: String(project.budgetApproved),
      riskLevel: project.riskLevel,
      charter: project.charter,
      charterAr: project.charterAr,
    })
  }, [project])

  useEffect(() => {
    if (!isNew || !managers[0]) return
    setForm((f) => (f.managerId ? f : { ...f, managerId: managers[0].id }))
  }, [isNew, managers])

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  if (!isNew && !project) {
    return <PageError message={t('manage.notFound')} onRetry={() => navigate('/manage')} />
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const onSaveProject = async () => {
    setError('')
    if (!form.code.trim() || !form.name.trim() || !form.managerId || !form.plannedStart || !form.plannedEnd) {
      setError(t('manage.requiredFields'))
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        const created = await createProject.mutateAsync({
          code: form.code.trim(),
          name: form.name.trim(),
          nameAr: form.nameAr.trim() || form.name.trim(),
          description: form.description.trim(),
          descriptionAr: form.descriptionAr.trim(),
          managerId: form.managerId,
          status: form.status,
          plannedStart: form.plannedStart,
          plannedEnd: form.plannedEnd,
          phase: form.phase.trim() || 'Initiation',
          budgetApproved: Number(form.budgetApproved) || 0,
          riskLevel: form.riskLevel,
          charter: form.charter.trim(),
          charterAr: form.charterAr.trim(),
        })
        navigate(`/manage/projects/${created.id}`, { replace: true })
      } else if (project) {
        await updateProject.mutateAsync({
          id: project.id,
          patch: {
            code: form.code.trim(),
            name: form.name.trim(),
            nameAr: form.nameAr.trim() || form.name.trim(),
            description: form.description.trim(),
            descriptionAr: form.descriptionAr.trim(),
            managerId: form.managerId,
            status: form.status,
            plannedStart: form.plannedStart,
            plannedEnd: form.plannedEnd,
            phase: form.phase.trim() || project.phase,
            budgetApproved: Number(form.budgetApproved) || 0,
            riskLevel: form.riskLevel,
            charter: form.charter.trim(),
            charterAr: form.charterAr.trim(),
          },
        })
      }
    } catch {
      setError(t('manage.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const onAddApp = async () => {
    if (!project) return
    if (!appDraft.code.trim() || !appDraft.name.trim() || !appDraft.plannedStart || !appDraft.plannedEnd) {
      setError(t('manage.appRequired'))
      return
    }
    setError('')
    const payload: ProjectApp = {
      id: '',
      projectId: project.id,
      code: appDraft.code.trim(),
      name: appDraft.name.trim(),
      nameAr: appDraft.nameAr.trim() || appDraft.name.trim(),
      description: appDraft.description.trim(),
      descriptionAr: '',
      ownerId: appDraft.ownerId || undefined,
      status: appDraft.status,
      plannedStart: appDraft.plannedStart,
      plannedEnd: appDraft.plannedEnd,
    }
    await upsertApp.mutateAsync(payload)
    setAppDraft({
      code: '',
      name: '',
      nameAr: '',
      description: '',
      ownerId: '',
      status: 'Planned',
      plannedStart: '',
      plannedEnd: '',
    })
  }

  const field = (label: string, children: React.ReactNode) => (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )

  return (
    <div>
      <PageHeader
        title={isNew ? t('manage.newProject') : t('manage.editProject')}
        description={
          isNew
            ? t('manage.newProjectHint')
            : language === 'ar'
              ? project?.nameAr
              : project?.name
        }
        actions={
          <Button variant="ghost" asChild>
            <Link to="/manage">
              <ArrowLeft className="me-1.5 h-4 w-4" />
              {t('manage.back')}
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t('manage.tabDetails')}</TabsTrigger>
          <TabsTrigger value="manager">{t('manage.tabManager')}</TabsTrigger>
          <TabsTrigger value="apps" disabled={isNew}>
            {t('manage.tabApps')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('manage.projectDetails')}</CardTitle>
              <CardDescription>{t('manage.projectDetailsHint')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field(t('manage.code'), <Input value={form.code} onChange={(e) => set('code', e.target.value)} />)}
              {field(
                t('manage.status'),
                <Select value={form.status} onValueChange={(v) => set('status', v as ProjectStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {field(t('manage.nameEn'), <Input value={form.name} onChange={(e) => set('name', e.target.value)} />)}
              {field(t('manage.nameAr'), <Input value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} dir="rtl" />)}
              {field(
                t('manage.descriptionEn'),
                <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} />,
              )}
              {field(
                t('manage.descriptionAr'),
                <Textarea value={form.descriptionAr} onChange={(e) => set('descriptionAr', e.target.value)} dir="rtl" />,
              )}
              {field(
                t('manage.plannedStart'),
                <Input type="date" value={form.plannedStart} onChange={(e) => set('plannedStart', e.target.value)} />,
              )}
              {field(
                t('manage.plannedEnd'),
                <Input type="date" value={form.plannedEnd} onChange={(e) => set('plannedEnd', e.target.value)} />,
              )}
              {field(t('manage.phase'), <Input value={form.phase} onChange={(e) => set('phase', e.target.value)} />)}
              {field(
                t('manage.budgetApproved'),
                <Input
                  type="number"
                  min={0}
                  value={form.budgetApproved}
                  onChange={(e) => set('budgetApproved', e.target.value)}
                />,
              )}
              {field(
                t('manage.riskLevel'),
                <Select value={form.riskLevel} onValueChange={(v) => set('riskLevel', v as RiskLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {field(t('manage.charterEn'), <Textarea value={form.charter} onChange={(e) => set('charter', e.target.value)} />)}
              {field(
                t('manage.charterAr'),
                <Textarea value={form.charterAr} onChange={(e) => set('charterAr', e.target.value)} dir="rtl" />,
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manager" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('manage.assignManager')}</CardTitle>
              <CardDescription>{t('manage.assignManagerHint')}</CardDescription>
            </CardHeader>
            <CardContent className="max-w-md space-y-4">
              {field(
                t('manage.manager'),
                <Select value={form.managerId} onValueChange={(v) => set('managerId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('manage.selectManager')} />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {language === 'ar' ? m.nameAr : m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {form.managerId ? (
                <p className="text-xs text-muted">
                  {managers.find((m) => m.id === form.managerId)?.email}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('manage.appsInProject')}</CardTitle>
              <CardDescription>{t('manage.appsInProjectHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {apps.length === 0 ? (
                <p className="text-sm text-muted">{t('manage.noApps')}</p>
              ) : (
                <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                  {apps.map((app) => (
                    <li key={app.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-navy">
                          <span className="text-royal">{app.code}</span>
                          {' · '}
                          {language === 'ar' ? app.nameAr : app.name}
                        </p>
                        <p className="text-xs text-muted">
                          {app.plannedStart} → {app.plannedEnd}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={app.status} />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('common.delete')}
                          onClick={() => setDeleteAppId(app.id)}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('manage.addApp')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field(t('manage.code'), <Input value={appDraft.code} onChange={(e) => setAppDraft((d) => ({ ...d, code: e.target.value }))} />)}
              {field(
                t('manage.status'),
                <Select
                  value={appDraft.status}
                  onValueChange={(v) => setAppDraft((d) => ({ ...d, status: v as ProjectAppStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {field(t('manage.nameEn'), <Input value={appDraft.name} onChange={(e) => setAppDraft((d) => ({ ...d, name: e.target.value }))} />)}
              {field(t('manage.nameAr'), <Input value={appDraft.nameAr} onChange={(e) => setAppDraft((d) => ({ ...d, nameAr: e.target.value }))} dir="rtl" />)}
              {field(
                t('manage.plannedStart'),
                <Input
                  type="date"
                  value={appDraft.plannedStart}
                  onChange={(e) => setAppDraft((d) => ({ ...d, plannedStart: e.target.value }))}
                />,
              )}
              {field(
                t('manage.plannedEnd'),
                <Input
                  type="date"
                  value={appDraft.plannedEnd}
                  onChange={(e) => setAppDraft((d) => ({ ...d, plannedEnd: e.target.value }))}
                />,
              )}
              {field(
                t('manage.appOwner'),
                <Select
                  value={appDraft.ownerId || 'none'}
                  onValueChange={(v) => setAppDraft((d) => ({ ...d, ownerId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('manage.selectOwner')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('manage.noOwner')}</SelectItem>
                    {(state.people ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {language === 'ar' ? p.nameAr : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              <div className="sm:col-span-2">
                {field(
                  t('manage.descriptionEn'),
                  <Textarea
                    value={appDraft.description}
                    onChange={(e) => setAppDraft((d) => ({ ...d, description: e.target.value }))}
                  />,
                )}
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => void onAddApp()} disabled={upsertApp.isPending}>
                  <Plus className="me-1.5 h-4 w-4" />
                  {t('manage.addApp')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => void onSaveProject()} disabled={saving}>
          {saving ? t('common.loading') : t('common.save')}
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/manage">{t('common.cancel')}</Link>
        </Button>
      </div>

      <ConfirmDialog
        open={Boolean(deleteAppId)}
        onOpenChange={(open) => {
          if (!open) setDeleteAppId(null)
        }}
        title={t('manage.deleteAppTitle')}
        description={t('manage.deleteAppBody')}
        confirmLabel={t('common.delete')}
        tone="danger"
        onConfirm={() => {
          if (deleteAppId) void deleteApp.mutateAsync(deleteAppId)
          setDeleteAppId(null)
        }}
      />
    </div>
  )
}
