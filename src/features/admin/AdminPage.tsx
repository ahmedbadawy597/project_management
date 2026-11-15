import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { useCreatePerson, usePeople, useUpdatePerson } from '@/api/hooks'
import { useDomain } from '@/api/useDomain'
import { useUiStore } from '@/data/ui-store'
import { useAuth } from '@/auth/AuthProvider'
import {
  ROLE_ACCESS_COPY,
  capabilitiesForRole,
  type AppRole,
} from '@/auth/permissions'
import type { Person } from '@/data/types'

const ROLES = Object.keys(ROLE_ACCESS_COPY) as AppRole[]

const emptyUser = {
  name: '',
  nameAr: '',
  email: '',
  department: 'General',
  role: 'Project Manager',
  appRole: 'Project Manager' as AppRole,
  active: true,
  projectIds: [] as string[],
}

export function AdminPage() {
  const { t } = useTranslation()
  const language = useUiStore((s) => s.language)
  const peopleQuery = usePeople()
  const { state } = useDomain()
  const createPerson = useCreatePerson()
  const updatePerson = useUpdatePerson()
  const { user, can } = useAuth()

  const [draft, setDraft] = useState(emptyUser)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const people = useMemo(() => peopleQuery.data ?? [], [peopleQuery.data])
  const projects = state?.projects ?? []
  const isAdmin = can('admin:view')

  if (peopleQuery.isLoading) return <PageLoading label={t('common.loading')} />
  if (peopleQuery.isError) return <PageError onRetry={() => void peopleQuery.refetch()} />

  function startEdit(p: Person) {
    setEditingId(p.id)
    setDraft({
      name: p.name,
      nameAr: p.nameAr,
      email: p.email,
      department: p.department,
      role: p.role,
      appRole: (p.appRole as AppRole) || 'Executive Viewer',
      active: p.active !== false,
      projectIds: [...(p.projectIds ?? [])],
    })
    setError('')
  }

  function resetForm() {
    setEditingId(null)
    setDraft(emptyUser)
    setError('')
  }

  async function saveUser() {
    if (!isAdmin) {
      setError(t('admin.adminOnly'))
      return
    }
    if (!draft.name.trim() || !draft.email.trim()) {
      setError(t('admin.userRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: draft.name.trim(),
        nameAr: draft.nameAr.trim() || draft.name.trim(),
        email: draft.email.trim(),
        department: draft.department.trim() || 'General',
        role: draft.role.trim() || draft.appRole,
        appRole: draft.appRole,
        active: draft.active,
        projectIds: draft.projectIds,
      }
      if (editingId) {
        await updatePerson.mutateAsync({ id: editingId, patch: payload })
        toast.success(t('admin.userUpdated'))
      } else {
        await createPerson.mutateAsync(payload)
        toast.success(t('admin.userCreated'))
      }
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.userSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(p: Person) {
    if (!isAdmin) {
      toast.error(t('admin.adminOnly'))
      return
    }
    try {
      await updatePerson.mutateAsync({
        id: p.id,
        patch: { active: p.active === false },
      })
      toast.success(p.active === false ? t('admin.userActivated') : t('admin.userDeactivated'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.userSaveFailed'))
    }
  }

  const projectLabel = (id: string) => {
    const p = projects.find((x) => x.id === id)
    if (!p) return id
    return `${p.code} · ${language === 'ar' ? p.nameAr : p.name}`
  }

  const roleLabel = (role: AppRole) => {
    if (role === 'Portfolio Director') return t('admin.roleAdminLabel')
    if (role === 'Developer') return t('admin.roleDeveloper')
    if (role === 'Business') return t('admin.roleBusiness')
    return role
  }

  return (
    <div>
      <PageHeader
        title={t('admin.title')}
        description={t('admin.subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/teams">{t('nav.teams')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/manage">{t('nav.manage')}</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-royal/20 bg-royal/5 px-4 py-3 text-sm text-navy">
        {t('admin.adminOnlyBanner')}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? t('admin.editUser') : t('admin.createUser')}</CardTitle>
            <CardDescription>{t('admin.createUserHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder={t('admin.name')}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                disabled={!isAdmin}
              />
              <Input
                placeholder={t('admin.nameAr')}
                value={draft.nameAr}
                onChange={(e) => setDraft((d) => ({ ...d, nameAr: e.target.value }))}
                disabled={!isAdmin}
                dir="rtl"
              />
            </div>
            <Input
              placeholder={t('admin.email')}
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              disabled={!isAdmin}
            />
            <Input
              placeholder={t('admin.department')}
              value={draft.department}
              onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))}
              disabled={!isAdmin}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder={t('admin.jobTitle')}
                value={draft.role}
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                disabled={!isAdmin}
              />
              <Select
                value={draft.appRole}
                onValueChange={(v) => {
                  const appRole = v as AppRole
                  setDraft((d) => ({
                    ...d,
                    appRole,
                    role:
                      appRole === 'Developer' || appRole === 'Business'
                        ? appRole
                        : d.role === 'Developer' || d.role === 'Business'
                          ? appRole
                          : d.role,
                  }))
                }}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.appRole')} />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted">{t('admin.assignProjects')}</p>
              <p className="mb-2 text-xs text-muted">{t('admin.assignProjectsHint')}</p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border/60 p-3">
                {projects.length === 0 ? (
                  <p className="text-xs text-muted">{t('admin.noProjects')}</p>
                ) : (
                  projects.map((p) => {
                    const checked = draft.projectIds.includes(p.id)
                    return (
                      <label key={p.id} className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!isAdmin}
                          onChange={(e) => {
                            setDraft((d) => ({
                              ...d,
                              projectIds: e.target.checked
                                ? [...new Set([...d.projectIds, p.id])]
                                : d.projectIds.filter((id) => id !== p.id),
                            }))
                          }}
                        />
                        <span>
                          <span className="text-royal">{p.code}</span>
                          {' · '}
                          {language === 'ar' ? p.nameAr : p.name}
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                disabled={!isAdmin}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              {t('admin.activeUser')}
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button onClick={() => void saveUser()} disabled={saving || !isAdmin}>
                {saving ? t('common.loading') : editingId ? t('common.save') : t('admin.createUser')}
              </Button>
              {editingId ? (
                <Button variant="outline" onClick={resetForm}>
                  {t('common.cancel')}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.roleMatrix')}</CardTitle>
            <CardDescription>{t('admin.roleMatrixHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ROLES.map((role) => (
              <div key={role} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-navy">{roleLabel(role)}</p>
                <p className="text-xs text-muted">{ROLE_ACCESS_COPY[role]}</p>
                <p className="mt-2 text-[11px] text-muted">
                  {capabilitiesForRole(role).length} capabilities
                  {role === 'Portfolio Director' ? ` · ${t('admin.fullAccess')}` : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.session')}</CardTitle>
            <CardDescription>{t('admin.sessionHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-navy">
              {language === 'ar' ? user?.nameAr : user?.name}
            </p>
            <p className="text-xs text-muted">
              {user?.username} · {user?.email}
            </p>
            <p className="text-xs text-muted">{user?.role}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('admin.directory')}</CardTitle>
            <CardDescription>{t('admin.directoryHint')}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
            {people.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-navy">
                    {language === 'ar' ? p.nameAr : p.name}
                    {p.active === false ? (
                      <span className="ms-2 text-xs text-destructive">({t('admin.inactive')})</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">{p.email}</p>
                  <p className="text-xs text-muted">
                    {p.role} · {p.appRole ? roleLabel(p.appRole as AppRole) : '—'} · {p.department}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t('admin.projects')}:{' '}
                    {(p.projectIds ?? []).length
                      ? (p.projectIds ?? []).map(projectLabel).join(', ')
                      : t('admin.noProjectAssignment')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={!isAdmin} onClick={() => startEdit(p)}>
                    {t('common.edit')}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={!isAdmin} onClick={() => void toggleActive(p)}>
                    {p.active === false ? t('admin.activate') : t('admin.deactivate')}
                  </Button>
                  {(p.projectIds ?? [])[0] ? (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/teams?project=${p.projectIds[0]}`}>{t('nav.teams')}</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
