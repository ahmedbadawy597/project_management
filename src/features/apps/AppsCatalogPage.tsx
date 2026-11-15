import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDomain } from '@/api/useDomain'
import { useAuth } from '@/auth/AuthProvider'
import { useDeleteApp, useReorderApps, useUpsertApp } from '@/api/hooks'
import type { AppPublishStatus, ProjectApp } from '@/data/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ICON_COLORS = ['#0F766E', '#B8860B', '#14532D', '#0E7490', '#1D4ED8', '#7C2D12']
const PUBLISH_STATUSES: AppPublishStatus[] = [
  'يعمل',
  'محدّث حديثًا',
  'Published',
  'Draft',
  'UnderReview',
  'Unpublished',
]

type EditDraft = {
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  url: string
  userCount: string
  readiness: string
  iconColor: string
  publishStatus: AppPublishStatus
  featured: boolean
}

function toDraft(app: ProjectApp): EditDraft {
  return {
    name: app.name,
    nameAr: app.nameAr,
    description: app.description,
    descriptionAr: app.descriptionAr,
    url: app.url ?? '',
    userCount: String(app.userCount ?? 0),
    readiness: String(app.readiness ?? 0),
    iconColor: app.iconColor ?? '#0F766E',
    publishStatus: app.publishStatus ?? 'Draft',
    featured: Boolean(app.featured),
  }
}

export function AppsCatalogPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const { state, isLoading, isError, refetch } = useDomain()
  const { can } = useAuth()
  const canWrite = can('projects:write')
  const upsertApp = useUpsertApp()
  const deleteApp = useDeleteApp()
  const reorderApps = useReorderApps()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const apps = useMemo(() => {
    const list = [...(state?.apps ?? [])]
    return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code))
  }, [state])

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />

  const editing = apps.find((a) => a.id === editingId) ?? null

  const startEdit = (app: ProjectApp) => {
    setEditingId(app.id)
    setDraft(toDraft(app))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  const saveEdit = async () => {
    if (!editing || !draft) return
    try {
      await upsertApp.mutateAsync({
        ...editing,
        name: draft.name.trim() || editing.name,
        nameAr: draft.nameAr.trim() || draft.name.trim() || editing.nameAr,
        description: draft.description.trim(),
        descriptionAr: draft.descriptionAr.trim() || draft.description.trim(),
        url: draft.url.trim(),
        userCount: Number(draft.userCount) || 0,
        readiness: Math.max(0, Math.min(100, Number(draft.readiness) || 0)),
        iconColor: draft.iconColor,
        publishStatus: draft.publishStatus,
        featured: draft.featured,
      })
      toast.success(t('appsCatalog.saved'))
      cancelEdit()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('manage.saveFailed'))
    }
  }

  const setPublish = async (app: ProjectApp, publishStatus: AppPublishStatus) => {
    try {
      await upsertApp.mutateAsync({ ...app, publishStatus })
      toast.success(t('appsCatalog.saved'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('manage.saveFailed'))
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= apps.length) return
    const ordered = apps.map((a) => a.id)
    ;[ordered[index], ordered[next]] = [ordered[next], ordered[index]]
    try {
      await reorderApps.mutateAsync(ordered)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('manage.saveFailed'))
    }
  }

  const publishLabel = (status?: AppPublishStatus) => {
    if (!status) return t('appsCatalog.draft')
    if (status === 'يعمل' || status === 'محدّث حديثًا') return status
    switch (status) {
      case 'Published':
        return t('appsCatalog.published')
      case 'UnderReview':
        return t('appsCatalog.underReview')
      case 'Unpublished':
        return t('appsCatalog.unpublished')
      default:
        return String(status)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('appsCatalog.title')}
        description={t(canWrite ? 'appsCatalog.subtitle' : 'appsCatalog.subtitleJoined')}
        actions={
          canWrite ? (
            <Button variant="outline" asChild>
              <Link to="/manage">{t('appsCatalog.manageProjects')}</Link>
            </Button>
          ) : null
        }
      />

      <div className={cn('grid gap-4', editing ? 'xl:grid-cols-[1.15fr_0.85fr]' : '')}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('appsCatalog.currentApps')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {apps.length === 0 ? (
              <p className="text-sm text-muted">
                {t(canWrite ? 'appsCatalog.empty' : 'appsCatalog.emptyJoined')}
              </p>
            ) : (
              apps.map((app, index) => {
                const title = language === 'ar' ? app.nameAr : app.name
                const desc = language === 'ar' ? app.descriptionAr || app.description : app.description
                const isEditing = editingId === app.id
                return (
                  <div
                    key={app.id}
                    className={cn(
                      'rounded-2xl border border-border/70 bg-surface/40 p-4',
                      isEditing && 'ring-2 ring-teal-600/40',
                    )}
                  >
                    <div className="flex flex-wrap gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                        style={{ backgroundColor: app.iconColor || '#0F766E' }}
                      >
                        {(language === 'ar' ? app.nameAr : app.name).slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-navy">{title}</p>
                            <p className="mt-1 text-xs text-muted line-clamp-2">{desc}</p>
                          </div>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                              app.publishStatus === 'Published' || app.publishStatus === 'يعمل'
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.publishStatus === 'UnderReview' ||
                                    app.publishStatus === 'محدّث حديثًا'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-700',
                            )}
                          >
                            {publishLabel(app.publishStatus)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                          <span>
                            {t('appsCatalog.users')}:{' '}
                            <strong className="text-navy">{(app.userCount ?? 0).toLocaleString()}</strong>
                          </span>
                          <span>
                            {t('appsCatalog.readiness')}:{' '}
                            <strong className="text-navy">{app.readiness ?? 0}%</strong>
                          </span>
                          {app.url ? (
                            <a
                              href={app.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-royal hover:underline"
                            >
                              {app.url.replace(/^https?:\/\//, '')}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                          {app.featured ? (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">
                              {t('appsCatalog.featured')}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button size="sm" asChild>
                            <Link to={`/apps/${app.id}`}>{t('appsCatalog.openWorkspace')}</Link>
                          </Button>
                        {canWrite ? (
                          <>
                            <Button size="sm" variant={isEditing ? 'default' : 'outline'} onClick={() => startEdit(app)}>
                              <Pencil className="me-1 h-3.5 w-3.5" />
                              {isEditing ? t('appsCatalog.editing') : t('common.edit')}
                            </Button>
                            {app.publishStatus === 'Published' || app.publishStatus === 'يعمل' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void setPublish(app, 'Unpublished')}
                              >
                                {t('appsCatalog.unpublish')}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void setPublish(app, 'يعمل')}
                              >
                                {t('appsCatalog.publish')}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/teams?project=${app.projectId}&app=${app.id}`}>
                                {t('appsCatalog.envManage')}
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger"
                              onClick={() => setDeleteId(app.id)}
                            >
                              <Trash2 className="me-1 h-3.5 w-3.5" />
                              {t('common.delete')}
                            </Button>
                            <div className="ms-auto flex gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                disabled={index === 0 || reorderApps.isPending}
                                onClick={() => void move(index, -1)}
                                aria-label={t('appsCatalog.moveUp')}
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                disabled={index === apps.length - 1 || reorderApps.isPending}
                                onClick={() => void move(index, 1)}
                                aria-label={t('appsCatalog.moveDown')}
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </>
                        ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {editing && draft ? (
          <Card className="h-fit">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">{t('appsCatalog.editApp')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                {t('appsCatalog.cancelEdit')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted">{t('appsCatalog.appName')}</span>
                <Input
                  value={language === 'ar' ? draft.nameAr : draft.name}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? language === 'ar'
                          ? { ...d, nameAr: e.target.value }
                          : { ...d, name: e.target.value }
                        : d,
                    )
                  }
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted">{t('appsCatalog.shortDesc')}</span>
                <Textarea
                  value={language === 'ar' ? draft.descriptionAr : draft.description}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? language === 'ar'
                          ? { ...d, descriptionAr: e.target.value }
                          : { ...d, description: e.target.value }
                        : d,
                    )
                  }
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted">{t('appsCatalog.directLink')}</span>
                <Input
                  value={draft.url}
                  onChange={(e) => setDraft((d) => (d ? { ...d, url: e.target.value } : d))}
                  placeholder="https://"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted">{t('appsCatalog.userCount')}</span>
                  <Input
                    type="number"
                    min={0}
                    value={draft.userCount}
                    onChange={(e) => setDraft((d) => (d ? { ...d, userCount: e.target.value } : d))}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted">{t('appsCatalog.readinessPct')}</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.readiness}
                    onChange={(e) => setDraft((d) => (d ? { ...d, readiness: e.target.value } : d))}
                  />
                </label>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted">{t('appsCatalog.iconColor')}</p>
                <div className="flex flex-wrap gap-2">
                  {ICON_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'h-8 w-8 rounded-full border-2',
                        draft.iconColor === color ? 'border-navy' : 'border-transparent',
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setDraft((d) => (d ? { ...d, iconColor: color } : d))}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted">{t('appsCatalog.statusLabel')}</span>
                <Select
                  value={draft.publishStatus}
                  onValueChange={(v) =>
                    setDraft((d) => (d ? { ...d, publishStatus: v as AppPublishStatus } : d))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLISH_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {publishLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => setDraft((d) => (d ? { ...d, featured: e.target.checked } : d))}
                />
                {t('appsCatalog.showFeatured')}
              </label>
              <Button className="w-full" onClick={() => void saveEdit()} disabled={upsertApp.isPending}>
                {t('common.save')}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title={t('manage.deleteAppTitle')}
        description={t('manage.deleteAppBody')}
        confirmLabel={t('common.delete')}
        tone="danger"
        onConfirm={() => {
          if (deleteId) {
            void deleteApp.mutateAsync(deleteId)
            if (editingId === deleteId) cancelEdit()
          }
          setDeleteId(null)
        }}
      />
    </div>
  )
}
