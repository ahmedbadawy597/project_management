import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react'
import { ProjectPackActions } from './ProjectPackActions'
import { RtlIcon } from '@/components/shared/RtlIcon'
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
  useAppMembers,
  useCreateProject,
  useDeleteApp,
  useProjectMembers,
  useSetAppMembers,
  useSetProjectMembers,
  useUpdateProject,
  useUpsertApp,
} from '@/api/hooks'
import type { AppMemberRole, ProjectApp, ProjectAppStatus, ProjectStatus, RiskLevel } from '@/data/types'
import { toast } from 'sonner'

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

type AppTeamDraft = {
  managerId: string
  developerIds: string[]
  businessIds: string[]
}

const emptyTeam: AppTeamDraft = { managerId: '', developerIds: [], businessIds: [] }

function teamToMembers(team: AppTeamDraft) {
  const members: Array<{ personId: string; role: AppMemberRole }> = []
  if (team.managerId) members.push({ personId: team.managerId, role: 'AppManager' })
  for (const id of team.developerIds) {
    if (id === team.managerId) continue
    members.push({ personId: id, role: 'Developer' })
  }
  for (const id of team.businessIds) {
    if (id === team.managerId || team.developerIds.includes(id)) continue
    members.push({ personId: id, role: 'Business' })
  }
  return members
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
  const membersQuery = useProjectMembers(isNew ? undefined : projectId)
  const setMembers = useSetProjectMembers()
  const setAppMembers = useSetAppMembers()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [editAppId, setEditAppId] = useState<string | null>(null)
  const [appTeam, setAppTeam] = useState<AppTeamDraft>(emptyTeam)
  const appMembersQuery = useAppMembers(editAppId ?? undefined)
  const [appDraft, setAppDraft] = useState({
    code: '',
    name: '',
    nameAr: '',
    description: '',
    status: 'Planned' as ProjectAppStatus,
    plannedStart: '',
    plannedEnd: '',
  })
  const [newAppTeam, setNewAppTeam] = useState<AppTeamDraft>(emptyTeam)
  const [deleteAppId, setDeleteAppId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab =
    tabParam === 'manager' || tabParam === 'team' || tabParam === 'apps' || tabParam === 'details'
      ? tabParam
      : 'details'

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

  const people = useMemo(
    () => (state?.people ?? []).filter((p) => p.active !== false),
    [state],
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
    if (membersQuery.data?.memberIds) {
      setTeamIds(membersQuery.data.memberIds)
    }
  }, [membersQuery.data])

  useEffect(() => {
    if (!appMembersQuery.data?.members) return
    const members = appMembersQuery.data.members
    setAppTeam({
      managerId: members.find((m) => m.role === 'AppManager')?.personId ?? '',
      developerIds: members.filter((m) => m.role === 'Developer').map((m) => m.personId),
      businessIds: members.filter((m) => m.role === 'Business').map((m) => m.personId),
    })
  }, [appMembersQuery.data])

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
    if (!newAppTeam.managerId) {
      setError(t('manage.appManagerRequired'))
      return
    }
    setError('')
    const members = teamToMembers(newAppTeam)
    const payload: ProjectApp & { members: typeof members } = {
      id: '',
      projectId: project.id,
      code: appDraft.code.trim(),
      name: appDraft.name.trim(),
      nameAr: appDraft.nameAr.trim() || appDraft.name.trim(),
      description: appDraft.description.trim(),
      descriptionAr: '',
      ownerId: newAppTeam.managerId,
      status: appDraft.status,
      plannedStart: appDraft.plannedStart,
      plannedEnd: appDraft.plannedEnd,
      members,
    }
    await upsertApp.mutateAsync(payload)
    setAppDraft({
      code: '',
      name: '',
      nameAr: '',
      description: '',
      status: 'Planned',
      plannedStart: '',
      plannedEnd: '',
    })
    setNewAppTeam(emptyTeam)
    toast.success(t('manage.appCreated'))
  }

  const field = (label: string, children: React.ReactNode) => (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )

  const renderTeamEditor = (
    team: AppTeamDraft,
    setTeam: React.Dispatch<React.SetStateAction<AppTeamDraft>>,
  ) => (
    <div className="space-y-4 sm:col-span-2">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-navy">{t('manage.appTeamTitle')}</p>
          <p className="text-xs text-muted">{t('manage.appTeamHint')}</p>
        </div>
        {field(
          t('manage.appManager'),
          <Select
            value={team.managerId || 'none'}
            onValueChange={(v) =>
              setTeam((d) => ({
                ...d,
                managerId: v === 'none' ? '' : v,
                developerIds: d.developerIds.filter((id) => id !== v),
                businessIds: d.businessIds.filter((id) => id !== v),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('manage.selectAppManager')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('manage.noOwner')}</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {language === 'ar' ? p.nameAr : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        )}
        <div>
          <p className="mb-2 text-xs font-medium text-muted">{t('manage.developers')}</p>
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-3">
            {people
              .filter((p) => p.id !== team.managerId)
              .map((p) => {
                const checked = team.developerIds.includes(p.id)
                return (
                  <label key={p.id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setTeam((d) => ({
                          ...d,
                          developerIds: e.target.checked
                            ? [...new Set([...d.developerIds, p.id])]
                            : d.developerIds.filter((id) => id !== p.id),
                          businessIds: e.target.checked
                            ? d.businessIds.filter((id) => id !== p.id)
                            : d.businessIds,
                        }))
                      }}
                    />
                    <span>
                      {language === 'ar' ? p.nameAr : p.name}
                      <span className="ms-2 text-xs text-muted">{p.role}</span>
                    </span>
                  </label>
                )
              })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted">{t('manage.businessMembers')}</p>
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-3">
            {people
              .filter((p) => p.id !== team.managerId && !team.developerIds.includes(p.id))
              .map((p) => {
                const checked = team.businessIds.includes(p.id)
                return (
                  <label key={p.id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setTeam((d) => ({
                          ...d,
                          businessIds: e.target.checked
                            ? [...new Set([...d.businessIds, p.id])]
                            : d.businessIds.filter((id) => id !== p.id),
                        }))
                      }}
                    />
                    <span>
                      {language === 'ar' ? p.nameAr : p.name}
                      <span className="ms-2 text-xs text-muted">{p.role}</span>
                    </span>
                  </label>
                )
              })}
          </div>
        </div>
      </div>
    </div>
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
              <RtlIcon icon={ArrowLeft} className="me-1.5 h-4 w-4" />
              {t('manage.back')}
            </Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('manage.packTitle')}</CardTitle>
          <CardDescription>{t('manage.packHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectPackActions projectId={isNew ? undefined : projectId} compact />
        </CardContent>
      </Card>

      <Tabs
        value={isNew ? 'details' : activeTab}
        onValueChange={(value) => {
          const next = new URLSearchParams(searchParams)
          if (value === 'details') next.delete('tab')
          else next.set('tab', value)
          setSearchParams(next, { replace: true })
        }}
      >
        <TabsList>
          <TabsTrigger value="details">{t('manage.tabDetails')}</TabsTrigger>
          <TabsTrigger value="manager">{t('manage.tabManager')}</TabsTrigger>
          <TabsTrigger value="team" disabled={isNew}>
            {t('manage.tabTeam')}
          </TabsTrigger>
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
              {field(
                t('manage.nameAr'),
                <Input value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} dir="rtl" />,
              )}
              {field(
                t('manage.plannedStart'),
                <Input
                  type="date"
                  value={form.plannedStart}
                  onChange={(e) => set('plannedStart', e.target.value)}
                />,
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
                    {RISK_LEVELS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`status.${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              <div className="sm:col-span-2">
                {field(
                  t('manage.descriptionEn'),
                  <Textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                  />,
                )}
              </div>
              <div className="sm:col-span-2">
                {field(
                  t('manage.descriptionAr'),
                  <Textarea
                    value={form.descriptionAr}
                    onChange={(e) => set('descriptionAr', e.target.value)}
                    dir="rtl"
                  />,
                )}
              </div>
              <div className="sm:col-span-2">
                {field(
                  t('manage.charterEn'),
                  <Textarea value={form.charter} onChange={(e) => set('charter', e.target.value)} />,
                )}
              </div>
              <div className="sm:col-span-2">
                {field(
                  t('manage.charterAr'),
                  <Textarea
                    value={form.charterAr}
                    onChange={(e) => set('charterAr', e.target.value)}
                    dir="rtl"
                  />,
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manager" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('manage.assignManager')}</CardTitle>
              <CardDescription>{t('manage.assignManagerHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {field(
                t('manage.manager'),
                <Select value={form.managerId || 'none'} onValueChange={(v) => set('managerId', v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('manage.selectManager')} />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {language === 'ar' ? p.nameAr : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('manage.teamTitle')}</CardTitle>
              <CardDescription>{t('manage.teamHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border/60 p-3">
                {people.map((p) => {
                  const checked = teamIds.includes(p.id) || p.id === form.managerId
                  return (
                    <label key={p.id} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={p.id === form.managerId}
                        onChange={(e) => {
                          setTeamIds((ids) =>
                            e.target.checked
                              ? [...new Set([...ids, p.id])]
                              : ids.filter((id) => id !== p.id),
                          )
                        }}
                      />
                      <span>
                        {language === 'ar' ? p.nameAr : p.name}
                        <span className="ms-2 text-xs text-muted">{p.role}</span>
                        {p.id === form.managerId ? (
                          <span className="ms-2 text-xs text-royal">({t('manage.manager')})</span>
                        ) : null}
                      </span>
                    </label>
                  )
                })}
              </div>
              <Button
                onClick={() => {
                  if (!projectId) return
                  const ids = [...new Set([...teamIds, form.managerId].filter(Boolean))]
                  void setMembers
                    .mutateAsync({ projectId, personIds: ids })
                    .then(() => toast.success(t('manage.teamSaved')))
                    .catch((e: Error) => toast.error(e.message || t('manage.saveFailed')))
                }}
                disabled={setMembers.isPending}
              >
                {t('manage.saveTeam')}
              </Button>
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
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/tickets?project=${projectId}&app=${app.id}`}>
                            {t('manage.openTickets')}
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditAppId(app.id)
                            const existing = state.appMembers?.[app.id] ?? []
                            setAppTeam({
                              managerId:
                                existing.find((m) => m.role === 'AppManager')?.personId ??
                                app.ownerId ??
                                '',
                              developerIds: existing
                                .filter((m) => m.role === 'Developer')
                                .map((m) => m.personId),
                              businessIds: existing
                                .filter((m) => m.role === 'Business')
                                .map((m) => m.personId),
                            })
                          }}
                        >
                          <Users className="me-1 h-3.5 w-3.5" />
                          {t('manage.editAppTeam')}
                        </Button>
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

          {editAppId ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('manage.editAppTeam')}</CardTitle>
                <CardDescription>{t('manage.appTeamHint')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {renderTeamEditor(appTeam, setAppTeam)}
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      void setAppMembers
                        .mutateAsync({ appId: editAppId, members: teamToMembers(appTeam) })
                        .then(() => {
                          toast.success(t('manage.appTeamSaved'))
                          setEditAppId(null)
                        })
                        .catch((e: Error) => toast.error(e.message || t('manage.saveFailed')))
                    }}
                    disabled={setAppMembers.isPending || !appTeam.managerId}
                  >
                    {t('manage.saveAppTeam')}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditAppId(null)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t('manage.addApp')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field(
                t('manage.code'),
                <Input
                  value={appDraft.code}
                  onChange={(e) => setAppDraft((d) => ({ ...d, code: e.target.value }))}
                />,
              )}
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
              {field(
                t('manage.nameEn'),
                <Input
                  value={appDraft.name}
                  onChange={(e) => setAppDraft((d) => ({ ...d, name: e.target.value }))}
                />,
              )}
              {field(
                t('manage.nameAr'),
                <Input
                  value={appDraft.nameAr}
                  onChange={(e) => setAppDraft((d) => ({ ...d, nameAr: e.target.value }))}
                  dir="rtl"
                />,
              )}
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
              <div className="sm:col-span-2">
                {field(
                  t('manage.descriptionEn'),
                  <Textarea
                    value={appDraft.description}
                    onChange={(e) => setAppDraft((d) => ({ ...d, description: e.target.value }))}
                  />,
                )}
              </div>
              {renderTeamEditor(newAppTeam, setNewAppTeam)}
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

      <div className="sticky bottom-0 z-[25] -mx-3 mt-6 flex flex-wrap gap-2 border-t border-border/70 bg-bg/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
        <Button className="min-h-11 min-w-[7rem]" onClick={() => void onSaveProject()} disabled={saving}>
          {saving ? t('common.loading') : t('common.save')}
        </Button>
        <Button variant="ghost" className="min-h-11" asChild>
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
