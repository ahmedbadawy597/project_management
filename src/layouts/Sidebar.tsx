import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/data/ui-store'
import { navItems } from './nav-items'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/AuthProvider'
import { NAV_CAPABILITY } from '@/auth/permissions'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const { can } = useAuth()

  const sections = [
    { id: 'main', label: t('nav.overview') },
    { id: 'delivery', label: t('common.delivery') },
    { id: 'governance', label: t('common.governance') },
    { id: 'system', label: t('common.system') },
  ] as const

  const visible = navItems.filter((item) => {
    const cap = NAV_CAPABILITY[item.key]
    return cap == null || can(cap)
  })

  return (
    <aside
      className={cn(
        'm-4 flex h-[calc(100vh-2rem)] flex-col self-start rounded-[2rem] bg-bg text-navy transition-all duration-300',
        'shadow-[7px_7px_14px_#D9D3BF,-7px_-7px_14px_#FFFFFF]',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      <div className={cn('flex h-16 items-center gap-3 px-4', collapsed && 'justify-center px-2')}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white shadow-[4px_4px_10px_#D9D3BF]">
          A
        </div>
        {!collapsed && (
          <div className="min-w-0 animate-fade-in">
            <p className="truncate text-sm font-bold tracking-tight">{t('app.ministry')}</p>
            <p className="truncate text-[11px] text-muted">{t('app.name')}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Main">
        {sections.map((section) => {
          const items = visible.filter((i) => i.section === section.id)
          if (!items.length) return null
          return (
            <div key={section.id} className="mb-3">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/70">
                  {section.label}
                </p>
              )}
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={onNavigate}
                        title={t(`nav.${item.key}`)}
                        className={({ isActive }) =>
                          cn(
                            'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                            isActive
                              ? 'bg-primary text-white shadow-[4px_4px_10px_#D9D3BF]'
                              : 'text-navy/70 hover:bg-white/50 hover:text-navy',
                            collapsed && 'justify-center px-2',
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{t(`nav.${item.key}`)}</span>}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-border/60 p-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full', collapsed && 'px-2')}
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && <span className="ms-2 text-xs">{t('common.collapse')}</span>}
        </Button>
      </div>
    </aside>
  )
}
