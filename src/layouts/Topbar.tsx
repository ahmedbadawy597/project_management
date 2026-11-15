import { useEffect, useMemo, useRef, useState } from 'react'
import { showDesktopNotification, isNotifyEnabled } from '@/lib/desktop-notify'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, HelpCircle, LogOut, Menu, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/data/ui-store'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from './Sidebar'
import { navItems } from './nav-items'
import { useAuth } from '@/auth/AuthProvider'
import { NAV_CAPABILITY } from '@/auth/permissions'
import { useBootstrap, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/api/hooks'
import { RtlIcon } from '@/components/shared/RtlIcon'
import { LtrField } from '@/components/shared/LtrField'

export function Topbar({ elevated = false }: { elevated?: boolean }) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const { user, logout, can } = useAuth()
  const notificationsQuery = useNotifications(true)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const bootstrap = useBootstrap()
  const projects = useMemo(() => bootstrap.data?.projects ?? [], [bootstrap.data?.projects])
  const notifications = notificationsQuery.data ?? []
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const unread = notifications.filter((n) => !n.read).length
  const lastNotifId = useRef<string | null>(null)

  useEffect(() => {
    const newest = notifications[0]
    if (!newest || newest.read) return
    if (lastNotifId.current == null) {
      lastNotifId.current = newest.id
      return
    }
    if (newest.id === lastNotifId.current) return
    lastNotifId.current = newest.id
    if (!isNotifyEnabled()) return
    if (document.visibilityState === 'visible' && document.hasFocus()) return
    void showDesktopNotification({
      title: language === 'ar' ? newest.titleAr || newest.title : newest.title,
      body: language === 'ar' ? newest.bodyAr || newest.body : newest.body,
      url: newest.href || '/notifications',
      tag: `ntf-${newest.id}`,
    })
  }, [notifications, language])

  const crumbs = useMemo(() => {
    const visibleNav = navItems.filter((n) => {
      const cap = NAV_CAPABILITY[n.key]
      return cap == null || can(cap)
    })
    const match = visibleNav.find(
      (n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'),
    )
    const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/)
    const manageMatch = location.pathname.match(/^\/manage\/projects\/([^/]+)/)
    const items = [{ label: t('nav.executive'), path: '/executive' }]
    if (match && match.path !== '/executive') items.push({ label: t(`nav.${match.key}`), path: match.path })
    if (projectMatch) {
      const project = projects.find((p) => p.id === projectMatch[1])
      if (project) items.push({ label: language === 'ar' ? project.nameAr : project.name, path: location.pathname })
    }
    if (manageMatch && manageMatch[1] !== 'new') {
      const project = projects.find((p) => p.id === manageMatch[1])
      if (project) {
        items.push({
          label: language === 'ar' ? project.nameAr : project.name,
          path: location.pathname,
        })
      }
    }
    return items
  }, [location.pathname, t, projects, language, can])

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return projects
      .filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.nameAr.includes(query))
      .slice(0, 6)
  }, [query, projects])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        searchRef.current?.focus()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleLang = () => {
    const next = language === 'en' ? 'ar' : 'en'
    setLanguage(next)
    void i18n.changeLanguage(next)
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-[30] flex h-14 shrink-0 items-center gap-2 px-3 transition-[box-shadow,background,border] duration-200 sm:h-16 sm:gap-3 sm:px-4',
        'pt-[env(safe-area-inset-top,0px)]',
        elevated ? 'header-elevated' : 'bg-bg',
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="min-h-11 min-w-11 shrink-0 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label={t('common.openMenu')}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden min-w-0 max-w-[220px] truncate lg:block xl:max-w-xs">
        <nav className="flex items-center gap-1 text-xs text-muted" aria-label={t('common.breadcrumb')}>
          {crumbs.map((c, i) => (
            <span key={c.path + i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <span className="opacity-50" aria-hidden>/</span>}
              <Link
                to={c.path}
                className={cn(
                  'truncate hover:text-primary',
                  i === crumbs.length - 1 && 'font-semibold text-navy',
                )}
              >
                {c.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>

      <div className="relative ms-auto min-w-0 flex-1 sm:max-w-md lg:max-w-xl">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted sm:start-4" />
        <Input
          ref={searchRef}
          className="h-10 rounded-full border-0 bg-bg ps-9 text-sm shadow-[inset_4px_4px_8px_#D9D3BF,inset_-4px_-4px_8px_#FFFFFF] focus-visible:ring-primary/30 sm:h-11 sm:ps-11"
          placeholder={t('common.search')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSearchOpen(true)
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          aria-label={t('common.search')}
        />
        {searchOpen && searchResults.length > 0 && (
          <div className="absolute inset-x-0 top-12 z-[40] max-h-[60vh] overflow-y-auto rounded-2xl bg-bg p-1 shadow-[7px_7px_14px_#D9D3BF,-7px_-7px_14px_#FFFFFF]">
            {searchResults.map((p) => (
              <button
                key={p.id}
                className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-start hover:bg-white/60"
                onMouseDown={() => {
                  navigate(`/projects/${p.id}`)
                  setQuery('')
                }}
              >
                <span className="text-sm font-medium text-navy">
                  {language === 'ar' ? p.nameAr : p.name}
                </span>
                <LtrField className="text-xs text-muted">{p.code}</LtrField>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-10 min-w-10 rounded-full border-0 bg-bg px-2.5 shadow-[4px_4px_10px_#D9D3BF,-4px_-4px_10px_#FFFFFF] sm:min-h-11 sm:px-3"
          onClick={toggleLang}
          aria-label={t('settings.language')}
        >
          {language === 'en' ? 'AR' : 'EN'}
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-10 min-w-10 sm:min-h-11 sm:min-w-11"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label={t('nav.notifications')}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white tabular-nums">
                {unread}
              </span>
            )}
          </Button>
          {notifOpen && (
            <div className="absolute end-0 top-11 z-[40] w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-surface shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-navy">{t('nav.notifications')}</p>
                <button className="text-xs text-royal" onClick={() => markAll.mutate()}>
                  {t('common.markAllRead')}
                </button>
              </div>
              <ul className="max-h-[min(20rem,50vh)] overflow-y-auto">
                {notifications.length === 0 ? (
                  <li className="px-4 py-6 text-center text-xs text-muted">{t('common.noResults')}</li>
                ) : (
                  notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        className={cn('w-full px-4 py-3 text-start hover:bg-bg', !n.read && 'bg-royal/5')}
                        onClick={() => {
                          markRead.mutate(n.id)
                          if (n.href) navigate(n.href)
                          setNotifOpen(false)
                        }}
                      >
                        <p className="text-sm font-medium text-navy" dir="auto">
                          {language === 'ar' ? n.titleAr : n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted" dir="auto">
                          {language === 'ar' ? n.bodyAr : n.body}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="hidden min-h-11 min-w-11 sm:inline-flex"
          aria-label={t('nav.help')}
          onClick={() => navigate('/settings')}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        <div className="hidden items-center gap-2 rounded-2xl bg-bg px-2 py-1 shadow-[4px_4px_10px_#D9D3BF,-4px_-4px_10px_#FFFFFF] md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
            {(language === 'ar' ? user?.nameAr : user?.name)?.charAt(0) ?? 'U'}
          </div>
          <div className="hidden max-w-[9rem] leading-tight lg:block">
            <p className="truncate text-xs font-medium text-navy">
              {language === 'ar' ? user?.nameAr : user?.name}
            </p>
            <p className="truncate text-[10px] text-muted">
              {user?.role ? t(`roles.${user.role}`, { defaultValue: user.role }) : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-10 min-w-10"
            aria-label={t('auth.signOut')}
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <RtlIcon icon={LogOut} className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="start" className="w-[min(300px,92vw)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('nav.overview')}</SheetTitle>
          </SheetHeader>
          <Sidebar embedded onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
