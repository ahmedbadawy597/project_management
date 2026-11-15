import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Save, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDomain } from '@/api/useDomain'
import {
  useAppMembers,
  useProjectMembers,
  useSetAppMembers,
  useSetProjectMembers,
} from '@/api/hooks'
import type { AppMemberRole } from '@/data/types'
import { toast } from 'sonner'

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

function membersToTeam(members: Array<{ personId: string; role: string }>): AppTeamDraft {
  return {
    managerId: members.find((m) => m.role === 'AppManager')?.personId ?? '',
    developerIds: members.filter((m) => m.role === 'Developer').map((m) => m.personId),
    businessIds: members.filter((m) => m.role === 'Business').map((m) => m.personId),
  }
}

export function TeamsPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const { state, isLoading, isError, refetch } = useDomain()
  const [params, setParams] = useSearchParams()

  const [projectId, setProjectId] = useState(params.get('project') ?? '')
  const [selectedAppId, setSelectedAppId] = useState(params.get('app') ?? '')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [appTeam, setAppTeam] = useState<AppTeamDraft>(emptyTeam)

  const membersQuery = useProjectMembers(projectId || undefined)
  const appMembersQuery = useAppMembers(selectedAppId || undefined)
  const setProjectMembers = useSetProjectMembers()
  const setAppMembers = useSetAppMembers()

  const people = useMemo(
    () => (state?.people ?? []).filter((p) => p.active !== false),
    [state],
  )

  const project = useMemo(
    () => state?.projects.find((p) => p.id === projectId) ?? null,
    [state, projectId],
  )

  const apps = useMemo(
    () => (state?.apps ?? []).filter((a) => a.projectId === projectId),
    [state, projectId],
  )

  useEffect(() => {
    const p = params.get('project')
    const a = params.get('app')
    if (p) setProjectId(p)
    if (a) setSelectedAppId(a)
  }, [params])

  useEffect(() => {
    if (!projectId && state?.projects[0]) {
      setProjectId(state.projects[0].id)
    }
  }, [state, projectId])

  useEffect(() => {
    if (membersQuery.data?.memberIds) {
      setTeamIds(membersQuery.data.memberIds)
    }
  }, [membersQuery.data])

  useEffect(() => {
    if (appMembersQuery.data?.members) {
      setAppTeam(membersToTeam(appMembersQuery.data.members))
      return
    }
    if (!selectedAppId || !state) return
    const existing = state.appMembers?.[selectedAppId]
    if (existing) setAppTeam(membersToTeam(existing))
  }, [appMembersQuery.data, selectedAppId, state])

  useEffect(() => {
    if (!projectId) return
    if (selectedAppId && apps.some((a) => a.id === selectedAppId)) return
    setSelectedAppId(apps[0]?.id ?? '')
  }, [projectId, apps, selectedAppId])

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />

  const selectProject = (id: string) => {
    setProjectId(id)
    setSelectedAppId('')
    setParams(id ? { project: id } : {})
  }

  const selectApp = (id: string) => {
    setSelectedAppId(id)
    const next: Record<string, string> = {}
    if (projectId) next.project = projectId
    if (id) next.app = id
    setParams(next)
  }

  const saveProjectTeam = async () => {
    if (!project) return
    const ids = [...new Set([...teamIds, project.managerId].filter(Boolean))]
    try {
      await setProjectMembers.mutateAsync({ projectId: project.id, personIds: ids })
      toast.success(t('teams.projectSaved'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('manage.saveFailed'))
    }
  }

  const saveAppTeam = async () => {
    if (!selectedAppId) return
    if (!appTeam.managerId) {
      toast.error(t('manage.appManagerRequired'))
      return
    }
    try {
      await setAppMembers.mutateAsync({
        appId: selectedAppId,
        members: teamToMembers(appTeam),
      })
      toast.success(t('teams.appSaved'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('manage.saveFailed'))
    }
  }

  const personName = (id: string) => {
    const p = people.find((x) => x.id === id)
    return p ? (language === 'ar' ? p.nameAr : p.name) : id
  }

  return (
    <div>
      <PageHeader
        title={t('teams.title')}
        description={t('teams.subtitle')}
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin">{t('teams.createUserAdmin')}</Link>
          </Button>
        }
      />

      <div className="mb-4 max-w-md">
        <label className="mb-1.5 block text-xs font-medium text-muted">{t('teams.selectProject')}</label>
        <Select value={projectId || 'none'} onValueChange={(v) => selectProject(v === 'none' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('teams.selectProject')} />
          </SelectTrigger>
          <SelectContent>
            {state.projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} · {language === 'ar' ? p.nameAr : p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!project ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">
            {t('teams.pickProject')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('teams.projectTeam')}</CardTitle>
              <CardDescription>
                {t('teams.projectTeamHint')}
                {project ? (
                  <>
                    {' '}
                    <Link className="text-royal underline" to={`/manage/projects/${project.id}`}>
                      {t('teams.editProject')}
                    </Link>
                  </>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted">
                {t('manage.manager')}: <span className="font-medium text-navy">{personName(project.managerId)}</span>
              </p>
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border/60 p-3">
                {people.map((p) => {
                  const checked = teamIds.includes(p.id) || p.id === project.managerId
                  return (
                    <label key={p.id} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={p.id === project.managerId}
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
                      </span>
                    </label>
                  )
                })}
              </div>
              <Button onClick={() => void saveProjectTeam()} disabled={setProjectMembers.isPending}>
                <Save className="me-1.5 h-4 w-4" />
                {t('teams.saveProjectTeam')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('teams.appTeam')}</CardTitle>
              <CardDescription>{t('teams.appTeamHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {apps.length === 0 ? (
                <p className="text-sm text-muted">
                  {t('teams.noApps')}{' '}
                  <Link className="text-royal underline" to={`/manage/projects/${project.id}`}>
                    {t('manage.addApp')}
                  </Link>
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {apps.map((app) => (
                      <Button
                        key={app.id}
                        size="sm"
                        variant={selectedAppId === app.id ? 'default' : 'outline'}
                        onClick={() => selectApp(app.id)}
                      >
                        {app.code}
                      </Button>
                    ))}
                  </div>

                  {selectedAppId ? (
                    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-navy">
                          {apps.find((a) => a.id === selectedAppId)?.code} ·{' '}
                          {language === 'ar'
                            ? apps.find((a) => a.id === selectedAppId)?.nameAr
                            : apps.find((a) => a.id === selectedAppId)?.name}
                        </p>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/tickets?project=${projectId}&app=${selectedAppId}`}>
                            {t('manage.openTickets')}
                          </Link>
                        </Button>
                      </div>

                      <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-muted">{t('manage.appManager')}</span>
                        <Select
                          value={appTeam.managerId || 'none'}
                          onValueChange={(v) =>
                            setAppTeam((d) => ({
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
                        </Select>
                      </label>

                      <div>
                        <p className="mb-2 text-xs font-medium text-muted">{t('manage.developers')}</p>
                        <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-3">
                          {people
                            .filter((p) => p.id !== appTeam.managerId)
                            .map((p) => {
                              const checked = appTeam.developerIds.includes(p.id)
                              return (
                                <label key={p.id} className="flex items-center gap-3 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      setAppTeam((d) => ({
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
                        <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-3">
                          {people
                            .filter(
                              (p) =>
                                p.id !== appTeam.managerId && !appTeam.developerIds.includes(p.id),
                            )
                            .map((p) => {
                              const checked = appTeam.businessIds.includes(p.id)
                              return (
                                <label key={p.id} className="flex items-center gap-3 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      setAppTeam((d) => ({
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

                      <Button onClick={() => void saveAppTeam()} disabled={setAppMembers.isPending}>
                        <Users className="me-1.5 h-4 w-4" />
                        {t('teams.saveAppTeam')}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
