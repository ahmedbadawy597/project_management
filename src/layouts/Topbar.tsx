import { useEffect, useMemo, useRef, useState } from 'react'
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

export function Topbar() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const { user, logout, can } = useAuth()
  const notificationsQuery = useNotifications()
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

  const crumbs = useMemo(() => {
    const visibleNav = navItems.filter((n) => {
      const cap = NAV_CAPABILITY[n.key]
      return cap == null || can(cap)
    })
    const match = visibleNav.find(
      (n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'),
    )
    const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/)
    const items = [{ label: t('nav.executive'), path: '/executive' }]
    if (match && match.path !== '/executive') items.push({ label: t(`nav.${match.key}`), path: match.path })
    if (projectMatch) {
      const project = projects.find((p) => p.id === projectMatch[1])
      if (project) items.push({ label: language === 'ar' ? project.nameAr : project.name, path: location.pathname })
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-bg px-4 pt-2">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden min-w-0 md:block">
        <nav className="flex items-center gap-1 text-xs text-muted" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={c.path + i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <Link to={c.path} className={cn('hover:text-primary', i === crumbs.length - 1 && 'font-semibold text-navy')}>
                {c.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>

      <div className="relative ms-auto w-full max-w-xl">
        <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          ref={searchRef}
          className="h-11 rounded-full border-0 bg-bg ps-11 shadow-[inset_4px_4px_8px_#D9D3BF,inset_-4px_-4px_8px_#FFFFFF] focus-visible:ring-primary/30"
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
          <div className="absolute inset-x-0 top-12 z-40 rounded-2xl bg-bg p-1 shadow-[7px_7px_14px_#D9D3BF,-7px_-7px_14px_#FFFFFF]">
            {searchResults.map((p) => (
              <button
                key={p.id}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-start hover:bg-bg"
                onMouseDown={() => {
                  navigate(`/projects/${p.id}`)
                  setQuery('')
                }}
              >
                <span className="text-sm font-medium text-navy">{language === 'ar' ? p.nameAr : p.name}</span>
                <span className="text-xs text-muted">{p.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-0 bg-bg shadow-[4px_4px_10px_#D9D3BF,-4px_-4px_10px_#FFFFFF]"
          onClick={toggleLang}
          aria-label="Switch language"
        >
          {language === 'en' ? 'AR' : 'EN'}
        </Button>

        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setNotifOpen((v) => !v)} aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white">
                {unread}
              </span>
            )}
          </Button>
          {notifOpen && (
            <div className="absolute end-0 top-11 z-40 w-80 rounded-xl border border-border bg-surface shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-navy">{t('nav.notifications')}</p>
                <button className="text-xs text-royal" onClick={() => markAll.mutate()}>
                  {t('common.markAllRead')}
                </button>
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      className={cn('w-full px-4 py-3 text-start hover:bg-bg', !n.read && 'bg-royal/5')}
                      onClick={() => {
                        markRead.mutate(n.id)
                        if (n.href) navigate(n.href)
                        setNotifOpen(false)
                      }}
                    >
                      <p className="text-sm font-medium text-navy">{language === 'ar' ? n.titleAr : n.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{language === 'ar' ? n.bodyAr : n.body}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon" aria-label={t('nav.help')} onClick={() => navigate('/settings')}>
          <HelpCircle className="h-4 w-4" />
        </Button>

        <div className="hidden items-center gap-2 rounded-2xl bg-bg px-2 py-1 shadow-[4px_4px_10px_#D9D3BF,-4px_-4px_10px_#FFFFFF] sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
            {(language === 'ar' ? user?.nameAr : user?.name)?.charAt(0) ?? 'U'}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-medium text-navy">{language === 'ar' ? user?.nameAr : user?.name}</p>
            <p className="text-[10px] text-muted">{user?.role}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label={t('auth.signOut')} onClick={() => { logout(); navigate('/login') }}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
