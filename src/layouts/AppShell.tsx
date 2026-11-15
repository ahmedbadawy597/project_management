import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUiStore } from '@/data/ui-store'
import { cn } from '@/lib/utils'
import { useLiveChatSync } from '@/hooks/useLiveChatSync'
import { registerNotifyServiceWorker } from '@/lib/desktop-notify'

export function AppShell() {
  const { t } = useTranslation()
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const density = useUiStore((s) => s.density)
  useLiveChatSync()

  useEffect(() => {
    void registerNotifyServiceWorker()
  }, [])
  const location = useLocation()
  const navType = useNavigationType()
  const mainRef = useRef<HTMLElement>(null)
  const [headerElevated, setHeaderElevated] = useState(false)
  const scrollPositions = useRef<Record<string, number>>({})

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    if (navType === 'POP') {
      el.scrollTop = scrollPositions.current[location.key] ?? 0
    } else {
      el.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [location.key, navType])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => {
      scrollPositions.current[location.key] = el.scrollTop
      setHeaderElevated(el.scrollTop > 4)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [location.key])

  return (
    <div
      className={cn(
        'flex h-dvh overflow-hidden bg-bg',
        density === 'compact' && 'density-compact',
      )}
      data-density={density}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-white"
      >
        {t('common.skipToContent')}
      </a>

      <div
        className={cn(
          'sticky top-0 z-[20] hidden h-dvh shrink-0 lg:block',
          collapsed ? 'w-[104px]' : 'w-[272px]',
        )}
      >
        <Sidebar />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar elevated={headerElevated} />
        <main
          ref={mainRef}
          id="main-content"
          className={cn(
            'min-h-0 flex-1',
            location.pathname.startsWith('/tickets')
              ? 'flex flex-col overflow-hidden px-3 py-3 sm:px-4 md:px-6 md:py-4 lg:pe-8 lg:ps-5'
              : 'app-scroll scroll-smooth-safe px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-4 md:p-6 lg:pe-8 lg:ps-5',
            density === 'compact' && !location.pathname.startsWith('/tickets') && 'p-3 md:p-4',
          )}
        >
          <div
            className={cn(
              location.pathname.startsWith('/tickets') ? 'page-shell-fill' : 'page-shell',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
