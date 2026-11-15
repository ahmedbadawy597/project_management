import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronsLeft, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/data/ui-store'
import { navItems } from './nav-items'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/AuthProvider'
import { NAV_CAPABILITY } from '@/auth/permissions'
import { RtlIcon } from '@/components/shared/RtlIcon'

export function Sidebar({
  onNavigate,
  embedded = false,
}: {
  onNavigate?: () => void
  embedded?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const language = useUiStore((s) => s.language)
  const { can, user, logout } = useAuth()

  const sections = [
    { id: 'main', label: t('nav.overview') },
    { id: 'delivery', label: t('common.delivery') },
    { id: 'governance', label: t('common.governance') },
    { id: 'system', label: t('common.system') },
  ] as const

  const canManage = can('projects:write')
  const visible = navItems.filter((item) => {
    // One projects entry: writers use Manage hub; viewers use portfolio list.
    if (item.key === 'projects' && canManage) return false
    if (item.key === 'manage' && !canManage) return false
    const cap = NAV_CAPABILITY[item.key]
    return cap == null || can(cap)
  })

  const compact = !embedded && collapsed

  return (
    <aside
      className={cn(
        'flex flex-col bg-bg text-navy transition-all duration-300',
        embedded
          ? 'h-full w-full rounded-none shadow-none'
          : cn(
              'm-4 h-[calc(100dvh-2rem)] self-start rounded-[2rem]',
              'shadow-[7px_7px_14px_#D9D3BF,-7px_-7px_14px_#FFFFFF]',
              compact ? 'w-[72px]' : 'w-[240px]',
            ),
      )}
    >
      <div
        className={cn(
          'flex h-16 items-center gap-3 px-4',
          compact && 'justify-center px-2',
          embedded && 'border-b border-border/60 pt-[env(safe-area-inset-top,0px)]',
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-base font-bold text-white shadow-[4px_4px_10px_#D9D3BF]">
          أ
        </div>
        {!compact && (
          <div className="min-w-0 animate-fade-in">
            <p className="truncate text-sm font-bold leading-tight">{t('app.ministry')}</p>
            <p className="truncate text-[12px] text-muted">{t('app.fullName')}</p>
          </div>
        )}
      </div>

      <nav className="sidebar-scroll flex-1 px-2 py-2" aria-label={t('nav.overview')}>
        {sections.map((section) => {
          const items = visible.filter((i) => i.section === section.id)
          if (!items.length) return null
          return (
            <div key={section.id} className="mb-3">
              {!compact && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold text-muted/80">
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
                            'group relative flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                            isActive
                              ? 'bg-primary text-white shadow-[4px_4px_10px_#D9D3BF]'
                              : 'text-navy/70 hover:bg-white/50 hover:text-navy',
                            compact && 'justify-center px-2',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive ? (
                              <span className="absolute inset-y-2 start-0 w-1 rounded-e-full bg-white/90" />
                            ) : null}
                            <Icon className="h-4 w-4 shrink-0" />
                            {!compact && <span className="truncate">{t(`nav.${item.key}`)}</span>}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-border/60 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
        {embedded ? (
          <div className="mb-1 flex items-center gap-2 rounded-2xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {(language === 'ar' ? user?.nameAr : user?.name)?.charAt(0) ?? 'U'}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
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
                onNavigate?.()
                navigate('/login')
              }}
            >
              <RtlIcon icon={LogOut} className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full min-h-11', compact && 'px-2')}
            onClick={toggleSidebar}
            aria-label={compact ? t('common.expand') : t('common.collapse')}
          >
            <RtlIcon
              icon={ChevronsLeft}
              className={cn('h-4 w-4', compact && 'rotate-180')}
            />
            {!compact && <span className="ms-2 text-xs">{t('common.collapse')}</span>}
          </Button>
        )}
      </div>
    </aside>
  )
}
