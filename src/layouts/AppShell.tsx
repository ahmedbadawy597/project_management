import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUiStore } from '@/data/ui-store'
import { cn } from '@/lib/utils'

export function AppShell() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const density = useUiStore((s) => s.density)

  return (
    <div
      className={cn('flex min-h-screen bg-bg', density === 'compact' && 'density-compact')}
      data-density={density}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className={cn('sticky top-0 hidden shrink-0 lg:block', collapsed ? 'w-[104px]' : 'w-[272px]')}>
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="main-content"
          className={cn('flex-1 p-4 md:p-6 lg:pe-8 lg:ps-4', density === 'compact' && 'p-3 md:p-4')}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
