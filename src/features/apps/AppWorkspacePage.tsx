import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ExternalLink,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Save,
  Users,
} from 'lucide-react'
import { RtlIcon } from '@/components/shared/RtlIcon'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { KPICard } from '@/components/shared/KPICard'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDomain } from '@/api/useDomain'
import { useAuth } from '@/auth/AuthProvider'
import {
  useAddTicketComment,
  useAppMembers,
  useCreateTicket,
  useSetAppMembers,
  useTicket,
  useTickets,
  useUpdateTicket,
  useUpsertApp,
} from '@/api/hooks'
import type { AppMemberRole, AppPublishStatus, ProjectApp, TicketUrgency } from '@/data/types'
import { APP_MEMBER_ROLES } from '@/data/types'
import { personName } from '@/data/selectors'
import { cn, formatDate } from '@/lib/utils'
import { AppProgressDashboard } from './AppProgressDashboard'

const PUBLISH_STATUSES: AppPublishStatus[] = [
  'يعمل',
  'محدّث حديثًا',
  'Published',
  'Draft',
  'UnderReview',
  'Unpublished',
]

const APP_STATUSES = ['Active', 'Planned', 'Completed', 'On Hold'] as const

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
  status: ProjectApp['status']
  ownerId: string
  featured: boolean
  plannedStart: string
  plannedEnd: string
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
    publishStatus: (app.publishStatus as AppPublishStatus) ?? 'يعمل',
    status: app.status,
    ownerId: app.ownerId ?? '',
    featured: Boolean(app.featured),
    plannedStart: app.plannedStart,
    plannedEnd: app.plannedEnd,
  }
}

export function AppWorkspacePage() {
  const { appId = '' } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const language = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const { state, isLoading, isError, refetch } = useDomain()
  const { can, user } = useAuth()
  const canWrite = can('projects:write')

  const upsertApp = useUpsertApp()
  const membersQuery = useAppMembers(appId || undefined)
  const setAppMembers = useSetAppMembers()
  const ticketsQuery = useTickets({ appId: appId || undefined })
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()
  const addComment = useAddTicketComment()

  const [tab, setTab] = useState('overview')
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [memberDraft, setMemberDraft] = useState<Array<{ personId: string; role: AppMemberRole }>>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>()
  const [comment, setComment] = useState('')
  const [newMsg, setNewMsg] = useState({ title: '', body: '', urgency: 'Normal' as TicketUrgency })

  const ticketDetail = useTicket(selectedTicketId)

  const app = state?.apps?.find((a) => a.id === appId)
  const project = state?.projects?.find((p) => p.id === app?.projectId)

  useEffect(() => {
    if (app) setDraft(toDraft(app))
  }, [app])

  useEffect(() => {
    if (membersQuery.data?.members) {
      setMemberDraft(
        membersQuery.data.members.map((m) => ({
          personId: m.personId,
          role: (m.role as AppMemberRole) || 'Contributor',
        })),
      )
    }
  }, [membersQuery.data])

  useEffect(() => {
    const list = ticketsQuery.data ?? []
    if (!selectedTicketId && list[0]) setSelectedTicketId(list[0].id)
  }, [ticketsQuery.data, selectedTicketId])

  const people = useMemo(
    () => (state?.people ?? []).filter((p) => p.active !== false),
    [state],
  )

  const tickets = ticketsQuery.data ?? []
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tk of tickets) {
      map[tk.status] = (map[tk.status] ?? 0) + 1
    }
    return map
  }, [tickets])

  const openTickets = tickets.filter((tk) => tk.status === 'Open' || tk.status === 'In Progress').length
  const manager =
    memberDraft.find((m) => m.role === 'AppManager') ??
    membersQuery.data?.members.find((m) => m.role === 'AppManager')

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />
  if (!app || !draft) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title={t('appWorkspace.notFound')}
        description={t('appWorkspace.notFoundBody')}
      />
    )
  }

  const title = language === 'ar' ? app.nameAr : app.name
  const description = language === 'ar' ? app.descriptionAr : app.description

  const saveDetails = async () => {
    try {
      await upsertApp.mutateAsync({
        ...app,
        name: draft.name.trim() || app.name,
        nameAr: draft.nameAr.trim() || draft.name.trim() || app.nameAr,
        description: draft.description.trim(),
        descriptionAr: draft.descriptionAr.trim() || draft.description.trim(),
        url: draft.url.trim(),
        userCount: Number(draft.userCount) || 0,
        readiness: Math.max(0, Math.min(100, Number(draft.readiness) || 0)),
        iconColor: draft.iconColor,
        publishStatus: draft.publishStatus,
        status: draft.status,
        ownerId: draft.ownerId || undefined,
        featured: draft.featured,
        plannedStart: draft.plannedStart,
        plannedEnd: draft.plannedEnd,
      })
      toast.success(t('appWorkspace.saved'))
      await refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('manage.saveFailed'))
    }
  }

  const saveTeam = async () => {
    try {
      await setAppMembers.mutateAsync({ appId: app.id, members: memberDraft })
      // Keep owner in sync with App Manager when assigned
      const mgr = memberDraft.find((m) => m.role === 'AppManager')
      if (mgr && mgr.personId !== app.ownerId) {
        await upsertApp.mutateAsync({ ...app, ownerId: mgr.personId })
      }
      toast.success(t('appWorkspace.teamSaved'))
      await refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('manage.saveFailed'))
    }
  }

  const addMemberRow = () => {
    const available = people.find((p) => !memberDraft.some((m) => m.personId === p.id))
    if (!available) {
      toast.error(t('appWorkspace.noMorePeople'))
      return
    }
    setMemberDraft((prev) => [...prev, { personId: available.id, role: 'Developer' }])
  }

  const postComment = async () => {
    if (!selectedTicketId || !comment.trim()) return
    try {
      await addComment.mutateAsync({ id: selectedTicketId, body: comment.trim() })
      setComment('')
      toast.success(t('appWorkspace.commentAdded'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('manage.saveFailed'))
    }
  }

  const createDiscussion = async () => {
    if (!newMsg.title.trim()) {
      toast.error(t('appWorkspace.titleRequired'))
      return
    }
    try {
      const created = await createTicket.mutateAsync({
        projectId: app.projectId,
        appId: app.id,
        type: 'Help',
        urgency: newMsg.urgency,
        tags: ['Update'],
        title: newMsg.title.trim(),
        titleAr: newMsg.title.trim(),
        body: newMsg.body.trim(),
        bodyAr: newMsg.body.trim(),
      })
      setNewMsg({ title: '', body: '', urgency: 'Normal' })
      setSelectedTicketId(created.id)
      setTab('chat')
      toast.success(t('appWorkspace.discussionCreated'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('manage.saveFailed'))
    }
  }

  return (
    <div className="page-enter">
      <PageHeader
        title={title}
        description={`${app.code} · ${project ? (language === 'ar' ? project.nameAr : project.name) : ''}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <RtlIcon icon={ArrowLeft} className="me-1 h-4 w-4" />
              {t('common.back')}
            </Button>
            {app.url ? (
              <Button variant="outline" asChild>
                <a href={app.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="me-1 h-4 w-4" />
                  {t('executive.openApp')}
                </a>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link to={`/tickets?app=${app.id}`}>{t('nav.tickets')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/teams?project=${app.projectId}&app=${app.id}`}>{t('nav.teams')}</Link>
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">{t('appWorkspace.tabOverview')}</TabsTrigger>
          <TabsTrigger value="team">{t('appWorkspace.tabTeam')}</TabsTrigger>
          <TabsTrigger value="status">{t('appWorkspace.tabStatus')}</TabsTrigger>
          <TabsTrigger value="chat">{t('appWorkspace.tabChat')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AppProgressDashboard
            app={app}
            wbs={state.wbs ?? []}
            description={description}
          />

          <div className="kpi-grid-4">
            <KPICard label={t('appWorkspace.teamMembers')} value={memberDraft.length} icon={Users} tone="info" />
            <KPICard label={t('appWorkspace.openItems')} value={openTickets} icon={MessageSquare} tone="warning" />
            <KPICard
              label={t('common.pm')}
              value={
                manager
                  ? personName(state, manager.personId, language)
                  : draft.ownerId
                    ? personName(state, draft.ownerId, language)
                    : t('executive.unassignedPm')
              }
              icon={LayoutDashboard}
              tone="teal"
            />
            <KPICard
              label={t('appsCatalog.publishStatus')}
              value={String(app.publishStatus || app.status)}
              icon={LayoutDashboard}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>{t('appWorkspace.details')}</CardTitle>
                <CardDescription>{t('appWorkspace.detailsHint')}</CardDescription>
              </div>
              {canWrite ? (
                <Button onClick={() => void saveDetails()} disabled={upsertApp.isPending}>
                  <Save className="me-1 h-4 w-4" />
                  {t('common.save')}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label={t('appsCatalog.nameEn')}>
                <Input
                  value={draft.name}
                  disabled={!canWrite}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label={t('appsCatalog.nameAr')}>
                <Input
                  value={draft.nameAr}
                  disabled={!canWrite}
                  onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
                />
              </Field>
              <Field label={t('appsCatalog.description')} className="md:col-span-2">
                <Textarea
                  value={language === 'ar' ? draft.descriptionAr : draft.description}
                  disabled={!canWrite}
                  rows={3}
                  onChange={(e) =>
                    setDraft(
                      language === 'ar'
                        ? { ...draft, descriptionAr: e.target.value }
                        : { ...draft, description: e.target.value },
                    )
                  }
                />
              </Field>
              <Field label={t('appsCatalog.url')}>
                <Input
                  dir="ltr"
                  value={draft.url}
                  disabled={!canWrite}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                />
              </Field>
              <Field label={t('executive.users')}>
                <Input
                  type="number"
                  value={draft.userCount}
                  disabled={!canWrite}
                  onChange={(e) => setDraft({ ...draft, userCount: e.target.value })}
                />
              </Field>
              <Field label={`${t('executive.readiness')} (${t('appDashboard.autoOrManual')})`}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.readiness}
                  disabled={!canWrite}
                  onChange={(e) => setDraft({ ...draft, readiness: e.target.value })}
                />
              </Field>
              <Field label={t('appsCatalog.publishStatus')}>
                <Select
                  value={draft.publishStatus}
                  disabled={!canWrite}
                  onValueChange={(v) => setDraft({ ...draft, publishStatus: v as AppPublishStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLISH_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('appWorkspace.appStatus')}>
                <Select
                  value={draft.status}
                  disabled={!canWrite}
                  onValueChange={(v) => setDraft({ ...draft, status: v as ProjectApp['status'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('common.pm')}>
                <Select
                  value={draft.ownerId || '__none__'}
                  disabled={!canWrite}
                  onValueChange={(v) => setDraft({ ...draft, ownerId: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('executive.unassignedPm')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('executive.unassignedPm')}</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {language === 'ar' ? p.nameAr : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('appWorkspace.startDate')}>
                <Input
                  type="date"
                  value={draft.plannedStart}
                  disabled={!canWrite}
                  onChange={(e) => setDraft({ ...draft, plannedStart: e.target.value })}
                />
              </Field>
              <Field label={t('appWorkspace.endDate')}>
                <Input
                  type="date"
                  value={draft.plannedEnd}
                  disabled={!canWrite}
                  onChange={(e) => setDraft({ ...draft, plannedEnd: e.target.value })}
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>{t('appWorkspace.team')}</CardTitle>
                <CardDescription>{t('appWorkspace.teamHint')}</CardDescription>
              </div>
              {canWrite ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addMemberRow}>
                    <Plus className="me-1 h-4 w-4" />
                    {t('appWorkspace.addMember')}
                  </Button>
                  <Button onClick={() => void saveTeam()} disabled={setAppMembers.isPending}>
                    <Save className="me-1 h-4 w-4" />
                    {t('common.save')}
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {memberDraft.length === 0 ? (
                <EmptyState icon={Users} title={t('appWorkspace.noTeam')} description={t('appWorkspace.noTeamBody')} />
              ) : (
                memberDraft.map((row, idx) => (
                  <div key={`${row.personId}-${idx}`} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-[1fr_180px_auto]">
                    <Select
                      value={row.personId}
                      disabled={!canWrite}
                      onValueChange={(v) =>
                        setMemberDraft((prev) => prev.map((m, i) => (i === idx ? { ...m, personId: v } : m)))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {people.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {language === 'ar' ? p.nameAr : p.name} · {p.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={row.role}
                      disabled={!canWrite}
                      onValueChange={(v) =>
                        setMemberDraft((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, role: v as AppMemberRole } : m)),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_MEMBER_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {canWrite ? (
                      <Button
                        variant="outline"
                        onClick={() => setMemberDraft((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        {t('common.remove')}
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(statusCounts).length === 0 ? (
              <Card className="md:col-span-2 xl:col-span-4">
                <CardContent className="pt-6">
                  <EmptyState
                    icon={LayoutDashboard}
                    title={t('appWorkspace.noStatus')}
                    description={t('appWorkspace.noStatusBody')}
                  />
                </CardContent>
              </Card>
            ) : (
              Object.entries(statusCounts).map(([status, count]) => (
                <Card key={status}>
                  <CardHeader className="pb-2">
                    <CardDescription>{status}</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{count}</CardTitle>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('appWorkspace.operationalSnapshot')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <Snapshot label={t('appsCatalog.publishStatus')} value={String(app.publishStatus ?? '—')} />
              <Snapshot label={t('appWorkspace.appStatus')} value={app.status} />
              <Snapshot label={t('executive.readiness')} value={`${app.readiness ?? 0}%`} />
              <Snapshot label={t('executive.users')} value={(app.userCount ?? 0).toLocaleString()} />
              <Snapshot label={t('appWorkspace.startDate')} value={formatDate(app.plannedStart)} />
              <Snapshot label={t('appWorkspace.endDate')} value={formatDate(app.plannedEnd)} />
              <Snapshot label={t('appWorkspace.discussions')} value={String(tickets.length)} />
              <Snapshot label={t('appWorkspace.openItems')} value={String(openTickets)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            <Card className="overflow-hidden">
              <CardHeader className="space-y-3">
                <CardTitle>{t('appWorkspace.discussions')}</CardTitle>
                {canWrite || can('tasks:write') ? (
                  <div className="space-y-2">
                    <Input
                      placeholder={t('appWorkspace.newTitle')}
                      value={newMsg.title}
                      onChange={(e) => setNewMsg({ ...newMsg, title: e.target.value })}
                    />
                    <Textarea
                      placeholder={t('appWorkspace.newBody')}
                      rows={2}
                      value={newMsg.body}
                      onChange={(e) => setNewMsg({ ...newMsg, body: e.target.value })}
                    />
                    <Button className="w-full" onClick={() => void createDiscussion()} disabled={createTicket.isPending}>
                      <Plus className="me-1 h-4 w-4" />
                      {t('appWorkspace.startDiscussion')}
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
                {tickets.length === 0 ? (
                  <p className="text-xs text-muted">{t('appWorkspace.noDiscussions')}</p>
                ) : (
                  tickets.map((tk) => (
                    <button
                      key={tk.id}
                      type="button"
                      onClick={() => setSelectedTicketId(tk.id)}
                      className={cn(
                        'w-full rounded-xl border p-3 text-start transition',
                        selectedTicketId === tk.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      <p className="text-sm font-medium text-navy line-clamp-1">
                        {language === 'ar' ? tk.titleAr || tk.title : tk.title}
                      </p>
                      <p className="mt-1 text-[11px] text-muted">
                        {tk.status} · {tk.urgency} · {tk.commentCount ?? tk.comments?.length ?? 0}{' '}
                        {t('appWorkspace.comments')}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('appWorkspace.conversation')}</CardTitle>
                <CardDescription>
                  {selectedTicketId
                    ? language === 'ar'
                      ? ticketDetail.data?.titleAr || ticketDetail.data?.title
                      : ticketDetail.data?.title
                    : t('appWorkspace.selectDiscussion')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedTicketId ? (
                  <EmptyState
                    icon={MessageSquare}
                    title={t('appWorkspace.selectDiscussion')}
                    description={t('appWorkspace.selectDiscussionBody')}
                  />
                ) : ticketDetail.isLoading ? (
                  <p className="text-sm text-muted">{t('common.loading')}</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={String(ticketDetail.data?.status ?? 'Open')}
                        disabled={!can('tasks:write')}
                        onValueChange={(v) =>
                          void updateTicket.mutateAsync({ id: selectedTicketId, patch: { status: v } })
                        }
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Open', 'In Progress', 'Resolved', 'Closed'].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="rounded-xl bg-bg/70 p-3 text-sm text-muted">
                      {language === 'ar'
                        ? ticketDetail.data?.bodyAr || ticketDetail.data?.body
                        : ticketDetail.data?.body}
                    </p>
                    <div className="max-h-72 space-y-3 overflow-y-auto">
                      {(ticketDetail.data?.comments ?? []).map((c) => (
                        <div key={c.id} className="rounded-xl border border-border p-3">
                          <p className="text-[11px] text-muted">
                            {personName(state, c.authorId, language)} · {formatDate(c.createdAt)}
                          </p>
                          <p className="mt-1 text-sm text-navy whitespace-pre-wrap">{c.body}</p>
                        </div>
                      ))}
                      {(ticketDetail.data?.comments ?? []).length === 0 ? (
                        <p className="text-xs text-muted">{t('appWorkspace.noComments')}</p>
                      ) : null}
                    </div>
                    {(can('tasks:write') || user) && (
                      <div className="flex gap-2">
                        <Textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder={t('appWorkspace.writeComment')}
                          rows={2}
                          className="flex-1"
                        />
                        <Button onClick={() => void postComment()} disabled={addComment.isPending || !comment.trim()}>
                          {t('appWorkspace.send')}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('space-y-1.5 text-xs font-semibold text-navy', className)}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-bg/50 p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-navy">{value}</p>
    </div>
  )
}
