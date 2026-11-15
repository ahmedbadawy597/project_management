import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  BellOff,
  Filter,
  MessageSquare,
  Plus,
  Search,
  Send,
} from 'lucide-react'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDomain } from '@/api/useDomain'
import { useAuth } from '@/auth/AuthProvider'
import { useAccessScope } from '@/hooks/useAccessScope'
import {
  useAddTicketComment,
  useCreateTicket,
  useTicket,
  useTickets,
  useUpdateTicket,
} from '@/api/hooks'
import { useIncomingChatWatch } from '@/hooks/useIncomingChatWatch'
import {
  enableDesktopNotifications,
  isNotifyEnabled,
  notificationPreference,
} from '@/lib/desktop-notify'
import type { TicketTag, TicketUrgency } from '@/data/types'
import { TICKET_TAGS } from '@/data/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TAG_TONE: Record<string, string> = {
  Risk: 'bg-amber-100/90 text-amber-950 border-amber-200/80',
  Problem: 'bg-red-100/90 text-red-950 border-red-200/80',
  NeedHelp: 'bg-sky-100/90 text-sky-950 border-sky-200/80',
  Immediate: 'bg-red-200/90 text-red-950 border-red-300 font-semibold',
  Blocked: 'bg-orange-100/90 text-orange-950 border-orange-200/80',
  Decision: 'bg-violet-100/90 text-violet-950 border-violet-200/80',
  Update: 'bg-slate-100/90 text-slate-800 border-slate-200/80',
}

const QUICK: Array<{ type: string; urgency: TicketUrgency; tags: TicketTag[]; labelKey: string }> = [
  { type: 'Help', urgency: 'High', tags: ['NeedHelp'], labelKey: 'tickets.quickHelp' },
  { type: 'Problem', urgency: 'High', tags: ['Problem'], labelKey: 'tickets.quickProblem' },
  { type: 'Risk', urgency: 'High', tags: ['Risk'], labelKey: 'tickets.quickRisk' },
  { type: 'Help', urgency: 'Immediate', tags: ['NeedHelp', 'Immediate'], labelKey: 'tickets.quickImmediate' },
]

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const
const URGENCIES: TicketUrgency[] = ['Normal', 'High', 'Immediate']

function TagChip({ tag, compact }: { tag: string; compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex border font-medium',
        compact ? 'rounded px-1.5 py-px text-[10px]' : 'rounded-md px-2 py-0.5 text-[11px]',
        TAG_TONE[tag] ?? 'border-border bg-muted text-foreground',
      )}
    >
      {t(`tickets.tags.${tag}`, { defaultValue: tag })}
    </span>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function formatChatTime(iso: string, locale: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return d.toLocaleString(locale, sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatInboxTime(iso: string, locale: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return locale.startsWith('ar') ? 'الآن' : 'now'
  if (mins < 60) return locale.startsWith('ar') ? `${mins} د` : `${mins}m`
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export function TicketsPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const locale = language === 'ar' ? 'ar-SA' : 'en-GB'
  const { user, can } = useAuth()
  const { isScoped } = useAccessScope()
  const { state, isLoading, isError, refetch } = useDomain()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('id') ?? undefined
  const canManage = can('projects:write')
  const appsHub = canManage ? '/manage' : '/apps-catalog'

  const [projectId, setProjectId] = useState(params.get('project') ?? 'all')
  const [appId, setAppId] = useState(params.get('app') ?? 'all')
  const [tag, setTag] = useState(params.get('tag') ?? 'all')
  const [urgency, setUrgency] = useState(params.get('urgency') ?? 'all')
  const [status, setStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [inboxQuery, setInboxQuery] = useState('')
  const [notifyOn, setNotifyOn] = useState(() => isNotifyEnabled())

  const filters = useMemo(
    () => ({
      projectId: projectId === 'all' ? undefined : projectId,
      appId: appId === 'all' ? undefined : appId,
      tag: tag === 'all' ? undefined : tag,
      urgency: urgency === 'all' ? undefined : urgency,
      status: status === 'all' ? undefined : status,
    }),
    [projectId, appId, tag, urgency, status],
  )

  const ticketsQuery = useTickets(filters, true)
  const ticketQuery = useTicket(selectedId, true)
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()
  const addComment = useAddTicketComment()
  useIncomingChatWatch(ticketQuery.data)

  const [draft, setDraft] = useState({
    title: '',
    body: '',
    projectId: '',
    appId: '',
    type: 'Task',
    urgency: 'Normal' as TicketUrgency,
    tags: [] as TicketTag[],
  })
  const [message, setMessage] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottomRef = useRef(true)
  const forceScrollRef = useRef(true)

  const filterActive =
    projectId !== 'all' || appId !== 'all' || tag !== 'all' || urgency !== 'all' || status !== 'all'

  useEffect(() => {
    const p = params.get('project')
    const a = params.get('app')
    if (p) setProjectId(p)
    if (a) {
      setAppId(a)
      setDraft((d) => ({ ...d, appId: a, projectId: p || d.projectId }))
    }
  }, [params])

  useEffect(() => {
    if (!draft.projectId && state?.projects[0]) {
      setDraft((d) => ({ ...d, projectId: state.projects[0].id }))
    }
  }, [state, draft.projectId])

  useEffect(() => {
    stickToBottomRef.current = true
    forceScrollRef.current = true
  }, [selectedId])

  useEffect(() => {
    const el = messagesRef.current
    if (!el) return
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight
      stickToBottomRef.current = gap < 96
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [selectedId])

  useEffect(() => {
    const el = messagesRef.current
    if (!el) return
    if (!forceScrollRef.current && !stickToBottomRef.current) return
    const instant = forceScrollRef.current
    forceScrollRef.current = false
    const scroll = () => {
      el.scrollTop = el.scrollHeight
    }
    if (instant) {
      scroll()
      requestAnimationFrame(scroll)
      return
    }
    el.classList.add('chat-scroll-smooth')
    scroll()
    const clear = window.setTimeout(() => el.classList.remove('chat-scroll-smooth'), 320)
    return () => window.clearTimeout(clear)
  }, [ticketQuery.data?.comments?.length, selectedId, ticketQuery.dataUpdatedAt])

  useEffect(() => {
    const el = composerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [message, selectedId])

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />

  const apps = (state.apps ?? []).filter((a) =>
    draft.projectId ? a.projectId === draft.projectId : true,
  )
  const filterApps = (state.apps ?? []).filter((a) =>
    projectId === 'all' ? true : a.projectId === projectId,
  )
  const tickets = (ticketsQuery.data ?? []).filter((tk) => {
    if (!inboxQuery.trim()) return true
    const q = inboxQuery.toLowerCase()
    const title = (language === 'ar' ? tk.titleAr || tk.title : tk.title).toLowerCase()
    return title.includes(q) || tk.tags.some((tg) => tg.toLowerCase().includes(q))
  })
  const selected = ticketQuery.data
  const myPersonId = user?.id

  const personLabel = (id?: string) => {
    if (!id) return '—'
    const p = state.people.find((x) => x.id === id)
    return p ? (language === 'ar' ? p.nameAr : p.name) : id
  }

  const personAvatar = (id?: string) => {
    const name = personLabel(id)
    return initials(name === '—' ? '?' : name)
  }

  const appLabel = (id?: string) => {
    if (!id) return null
    const a = state.apps?.find((x) => x.id === id)
    if (!a) return null
    return language === 'ar' ? a.nameAr : a.name
  }

  const openCreate = (preset?: (typeof QUICK)[number]) => {
    setShowCreate(true)
    setDraft((d) => ({
      ...d,
      title: '',
      body: '',
      type: preset?.type ?? 'Task',
      urgency: preset?.urgency ?? 'Normal',
      tags: preset?.tags ?? [],
      projectId: projectId !== 'all' ? projectId : d.projectId || state.projects[0]?.id || '',
      appId: appId !== 'all' ? appId : d.appId,
    }))
  }

  const submitCreate = async () => {
    if (!draft.title.trim() || !draft.projectId) {
      toast.error(t('tickets.required'))
      return
    }
    try {
      const created = await createTicket.mutateAsync({
        projectId: draft.projectId,
        appId: draft.appId || undefined,
        type: draft.type,
        urgency: draft.urgency,
        tags: draft.tags,
        title: draft.title.trim(),
        titleAr: draft.title.trim(),
        body: draft.body.trim(),
      })
      toast.success(t('tickets.created'))
      setParams({ id: created.id })
      setDraft((d) => ({ ...d, title: '', body: '', tags: [] }))
      setShowCreate(false)
      setTimeout(() => composerRef.current?.focus(), 100)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tickets.saveFailed'))
    }
  }

  const selectTicket = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('id', id)
    setParams(next)
    setMessage('')
    stickToBottomRef.current = true
    forceScrollRef.current = true
    setTimeout(() => composerRef.current?.focus(), 80)
  }

  const sendMessage = async () => {
    if (!selectedId || !message.trim()) return
    const body = message.trim()
    setMessage('')
    stickToBottomRef.current = true
    forceScrollRef.current = true
    try {
      await addComment.mutateAsync({ id: selectedId, body })
    } catch (e) {
      setMessage(body)
      toast.error(e instanceof Error ? e.message : t('tickets.saveFailed'))
    }
  }

  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const toggleNotify = () => {
    void (async () => {
      const perm = await enableDesktopNotifications()
      setNotifyOn(perm === 'granted')
      if (perm === 'granted') toast.success(t('tickets.notifyEnabled'))
      else if (perm === 'denied') toast.error(t('tickets.notifyDenied'))
      else if (perm === 'unsupported') toast.error(t('tickets.notifyUnsupported'))
    })()
  }

  const selectedAppName = selected ? appLabel(selected.appId) : null

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      {/* Compact workspace bar */}
      <header className="flex shrink-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-8 shrink-0 rounded-full bg-primary" aria-hidden />
            <h1 className="truncate text-lg font-bold tracking-tight text-navy sm:text-xl">
              {t('tickets.chatTitle')}
            </h1>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted sm:text-[13px]">
            {t(isScoped ? 'tickets.chatSubtitleJoined' : 'tickets.chatSubtitle')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-10 min-w-10 text-muted hover:text-navy"
            onClick={toggleNotify}
            aria-label={t('tickets.enableNotify')}
            title={t('tickets.enableNotify')}
          >
            {notifyOn || notificationPreference() === 'granted' ? (
              <Bell className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            className={cn('min-h-10 gap-1.5 px-3', filterActive && 'border-primary/40 text-primary')}
            onClick={() => setShowFilters(true)}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tickets.filters')}</span>
            {filterActive ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                !
              </span>
            ) : null}
          </Button>
          <Button className="min-h-10 gap-1.5 px-3 sm:px-4" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">{t('tickets.newChat')}</span>
          </Button>
        </div>
      </header>

      {/* Chat workspace */}
      <div className="chat-shell neo flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="flex max-h-[36%] min-h-0 w-full shrink-0 flex-col border-b border-border/50 lg:max-h-none lg:w-[300px] xl:w-[328px] lg:border-b-0 lg:border-e">
          <div className="shrink-0 space-y-2.5 border-b border-border/50 px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <Input
                className="h-10 border-transparent bg-white/50 pe-3 ps-9 shadow-none focus-visible:bg-white"
                value={inboxQuery}
                onChange={(e) => setInboxQuery(e.target.value)}
                placeholder={t('tickets.searchChats')}
                aria-label={t('tickets.searchChats')}
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-0.5">
              <p className="text-[11px] font-medium text-muted">
                {t('tickets.inboxCount', { count: tickets.length })}
              </p>
              {filterActive ? (
                <button
                  type="button"
                  className="text-[11px] font-semibold text-primary hover:underline"
                  onClick={() => {
                    setProjectId('all')
                    setAppId('all')
                    setTag('all')
                    setUrgency('all')
                    setStatus('all')
                  }}
                >
                  {t('common.clear', { defaultValue: language === 'ar' ? 'مسح' : 'Clear' })}
                </button>
              ) : null}
            </div>
          </div>

          <div className="chat-scroll min-h-0 flex-1 p-2">
            {tickets.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-3 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-navy">{t('tickets.empty')}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{t('tickets.emptyBody')}</p>
                <Button className="mt-4 min-h-10" size="sm" onClick={() => openCreate()}>
                  <Plus className="me-1.5 h-3.5 w-3.5" />
                  {t('tickets.newChat')}
                </Button>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {tickets.map((ticket) => {
                  const active = selectedId === ticket.id
                  const title = language === 'ar' ? ticket.titleAr || ticket.title : ticket.title
                  const appName = appLabel(ticket.appId)
                  const stamp = formatInboxTime(ticket.updatedAt || ticket.createdAt, locale)
                  return (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        onClick={() => selectTicket(ticket.id)}
                        className={cn(
                          'group flex w-full gap-2.5 rounded-2xl px-2.5 py-2.5 text-start transition-colors',
                          active
                            ? 'bg-primary text-white shadow-[3px_3px_8px_rgba(217,211,191,0.7)]'
                            : 'hover:bg-white/70',
                        )}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                            active ? 'bg-white/20 text-white' : 'bg-navy/[0.08] text-navy',
                          )}
                        >
                          {personAvatar(ticket.reporterId)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p
                              className={cn(
                                'truncate text-[13px] font-semibold leading-snug',
                                active ? 'text-white' : 'text-navy',
                              )}
                            >
                              {title}
                            </p>
                            <time
                              className={cn(
                                'shrink-0 text-[10px] tabular-nums',
                                active ? 'text-white/65' : 'text-muted',
                              )}
                            >
                              {stamp}
                            </time>
                          </div>
                          <p
                            className={cn(
                              'mt-0.5 truncate text-[11px]',
                              active ? 'text-white/70' : 'text-muted',
                            )}
                          >
                            {appName ?? t(`status.${ticket.status}`, { defaultValue: String(ticket.status) })}
                            <span className="mx-1 opacity-50">·</span>
                            {personLabel(ticket.reporterId)}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1">
                            {(ticket.tags ?? []).slice(0, 2).map((tg) => (
                              <span
                                key={tg}
                                className={cn(
                                  'rounded px-1.5 py-px text-[10px] font-medium',
                                  active ? 'bg-white/15 text-white' : 'bg-bg text-muted',
                                )}
                              >
                                {t(`tickets.tags.${tg}`, { defaultValue: tg })}
                              </span>
                            ))}
                            {(ticket.commentCount ?? 0) > 0 ? (
                              <span
                                className={cn(
                                  'ms-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                  active ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary',
                                )}
                              >
                                {ticket.commentCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[linear-gradient(165deg,rgba(31,107,71,0.035)_0%,transparent_28%)]">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-bg text-primary shadow-[6px_6px_14px_#D9D3BF,-6px_-6px_14px_#FFFFFF]">
                <MessageSquare className="h-7 w-7" />
              </div>
              <div className="max-w-sm text-center">
                <p className="text-base font-bold text-navy">{t('tickets.selectHintTitle')}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t('tickets.selectHint')}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q.labelKey}
                    type="button"
                    onClick={() => openCreate(q)}
                    className="min-h-9 rounded-xl bg-bg px-3.5 text-xs font-semibold text-navy shadow-[4px_4px_10px_#D9D3BF,-4px_-4px_10px_#FFFFFF] transition hover:text-primary"
                  >
                    {t(q.labelKey)}
                  </button>
                ))}
              </div>
              <Link className="text-xs font-medium text-primary hover:underline" to={appsHub}>
                {t('tickets.manageApps')}
              </Link>
            </div>
          ) : ticketQuery.isLoading || !selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              {t('common.loading')}
            </div>
          ) : (
            <>
              <header className="flex shrink-0 items-start gap-3 border-b border-border/50 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[15px] font-bold text-navy sm:text-base" dir="auto">
                      {language === 'ar' ? selected.titleAr || selected.title : selected.title}
                    </h2>
                    {selected.tags.slice(0, 3).map((tg) => (
                      <TagChip key={tg} tag={tg} compact />
                    ))}
                  </div>
                  <p className="mt-1 truncate text-[12px] text-muted">
                    {selectedAppName ? (
                      <>
                        <span className="font-medium text-navy/70">{selectedAppName}</span>
                        <span className="mx-1.5 text-border">·</span>
                      </>
                    ) : null}
                    {personLabel(selected.reporterId)}
                    {selected.assigneeId ? (
                      <>
                        <span className="mx-1">→</span>
                        {personLabel(selected.assigneeId)}
                      </>
                    ) : null}
                  </p>
                </div>
                <Select
                  value={String(selected.status)}
                  onValueChange={(v) =>
                    void updateTicket
                      .mutateAsync({ id: selected.id, patch: { status: v } })
                      .then(() => toast.success(t('tickets.updated')))
                  }
                >
                  <SelectTrigger className="h-9 w-[132px] shrink-0 border-border/60 bg-bg/80 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </header>

              <div
                ref={messagesRef}
                className="chat-scroll chat-scroll-fade min-h-0 flex-1 space-y-4 px-3 py-4 sm:px-6 sm:py-5"
              >
                <ChatBubble
                  mine={selected.reporterId === myPersonId}
                  name={personLabel(selected.reporterId)}
                  avatar={personAvatar(selected.reporterId)}
                  time={formatChatTime(selected.createdAt, locale)}
                  body={
                    language === 'ar'
                      ? selected.bodyAr || selected.body || selected.titleAr || selected.title
                      : selected.body || selected.title
                  }
                  opening
                  openingLabel={t('tickets.openingMessage')}
                />

                {(selected.comments ?? []).map((c) => (
                  <ChatBubble
                    key={c.id}
                    mine={c.authorId === myPersonId}
                    name={personLabel(c.authorId)}
                    avatar={personAvatar(c.authorId)}
                    time={formatChatTime(c.createdAt, locale)}
                    body={c.body}
                  />
                ))}
              </div>

              <footer className="shrink-0 border-t border-border/50 bg-bg/80 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md sm:px-5">
                <div className="flex items-end gap-2 rounded-2xl bg-white/55 p-1.5 shadow-[inset_3px_3px_8px_rgba(217,211,191,0.55),inset_-3px_-3px_8px_rgba(255,255,255,0.9)]">
                  <Textarea
                    ref={composerRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={onComposerKey}
                    placeholder={t('tickets.chatPlaceholder')}
                    rows={1}
                    className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-3 py-2.5 shadow-none focus-visible:ring-0"
                  />
                  <Button
                    className="mb-0.5 me-0.5 min-h-10 min-w-10 shrink-0 rounded-xl"
                    size="icon"
                    onClick={() => void sendMessage()}
                    disabled={addComment.isPending || !message.trim()}
                    aria-label={t('tickets.addComment')}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1.5 px-1 text-[10px] text-muted">{t('tickets.chatHint')}</p>
              </footer>
            </>
          )}
        </section>
      </div>

      {/* New conversation */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('tickets.newChat')}</DialogTitle>
            <DialogDescription>{t('tickets.createHint')}</DialogDescription>
          </DialogHeader>
          <div className="mb-1 flex flex-wrap gap-2">
            {QUICK.map((q) => {
              const on =
                draft.tags.join() === q.tags.join() && draft.urgency === q.urgency
              return (
                <button
                  key={q.labelKey}
                  type="button"
                  onClick={() => openCreate(q)}
                  className={cn(
                    'min-h-8 rounded-lg border px-2.5 text-xs font-semibold transition',
                    on
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/70 bg-bg text-muted hover:text-navy',
                  )}
                >
                  {t(q.labelKey)}
                </button>
              )
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={draft.projectId || 'none'}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, projectId: v === 'none' ? '' : v, appId: '' }))
              }
            >
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder={t('tickets.project')} />
              </SelectTrigger>
              <SelectContent>
                {state.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {language === 'ar' ? p.nameAr : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={draft.appId || 'none'}
              onValueChange={(v) => setDraft((d) => ({ ...d, appId: v === 'none' ? '' : v }))}
            >
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder={t('tickets.app')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('tickets.noApp')}</SelectItem>
                {apps.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {language === 'ar' ? a.nameAr : a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="min-h-11 sm:col-span-2"
              placeholder={t('tickets.titlePlaceholder')}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              autoFocus
            />
            <Textarea
              className="min-h-[88px] sm:col-span-2"
              placeholder={t('tickets.bodyPlaceholder')}
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            />
            <div className="flex flex-wrap gap-1.5 sm:col-span-2">
              {TICKET_TAGS.map((tg) => {
                const on = draft.tags.includes(tg)
                return (
                  <button
                    key={tg}
                    type="button"
                    className={cn(
                      'min-h-8 rounded-lg border px-2.5 text-xs font-medium transition',
                      on ? TAG_TONE[tg] : 'border-border/70 bg-bg text-muted hover:text-navy',
                    )}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        tags: on ? d.tags.filter((x) => x !== tg) : [...d.tags, tg],
                        urgency: tg === 'Immediate' && !on ? 'Immediate' : d.urgency,
                      }))
                    }
                  >
                    {t(`tickets.tags.${tg}`, { defaultValue: tg })}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" className="min-h-11" onClick={() => setShowCreate(false)}>
                {t('common.cancel', { defaultValue: language === 'ar' ? 'إلغاء' : 'Cancel' })}
              </Button>
              <Button
                className="min-h-11"
                onClick={() => void submitCreate()}
                disabled={createTicket.isPending}
              >
                <MessageSquare className="me-1.5 h-4 w-4" />
                {t('tickets.startChat')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('tickets.filters')}</DialogTitle>
            <DialogDescription>
              {t(isScoped ? 'tickets.chatSubtitleJoined' : 'tickets.chatSubtitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder={t('tickets.project')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {state.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {language === 'ar' ? p.nameAr : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={appId} onValueChange={setAppId}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder={t('tickets.app')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {filterApps.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {language === 'ar' ? a.nameAr : a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder={t('tickets.tag')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {TICKET_TAGS.map((tg) => (
                  <SelectItem key={tg} value={tg}>
                    {t(`tickets.tags.${tg}`, { defaultValue: tg })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder={t('tickets.urgency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {URGENCIES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {t(`tickets.urgencyLabels.${u}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder={t('tickets.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                className="min-h-10"
                onClick={() => {
                  setProjectId('all')
                  setAppId('all')
                  setTag('all')
                  setUrgency('all')
                  setStatus('all')
                }}
              >
                {t('common.clear', { defaultValue: language === 'ar' ? 'مسح' : 'Clear' })}
              </Button>
              <Button className="min-h-10" onClick={() => setShowFilters(false)}>
                {t('common.apply', { defaultValue: language === 'ar' ? 'تطبيق' : 'Apply' })}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChatBubble({
  mine,
  name,
  avatar,
  time,
  body,
  opening,
  openingLabel,
}: {
  mine: boolean
  name: string
  avatar: string
  time: string
  body: string
  opening?: boolean
  openingLabel?: string
}) {
  return (
    <div className={cn('flex gap-2.5', mine ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
          mine ? 'bg-primary text-white' : 'bg-navy/[0.08] text-navy',
        )}
      >
        {avatar}
      </div>
      <div className={cn('max-w-[min(100%,32rem)]', mine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'mb-1 flex items-center gap-2 text-[11px]',
            mine ? 'flex-row-reverse' : 'flex-row',
          )}
        >
          <span className="font-semibold text-navy/80">{name}</span>
          <time className="text-muted tabular-nums">{time}</time>
          {opening ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {openingLabel}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            'px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap sm:text-sm',
            mine
              ? 'rounded-2xl rounded-ee-md bg-primary text-white shadow-[2px_2px_8px_rgba(31,107,71,0.22)]'
              : 'rounded-2xl rounded-es-md border border-border/60 bg-bg/90 text-navy shadow-[2px_2px_8px_rgba(217,211,191,0.45)]',
            opening && !mine && 'border-primary/25 bg-primary/[0.06]',
          )}
          dir="auto"
        >
          {body}
        </div>
      </div>
    </div>
  )
}
