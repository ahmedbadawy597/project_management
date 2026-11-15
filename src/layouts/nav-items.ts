import {
  LayoutDashboard,
  FolderKanban,
  Map,
  GanttChartSquare,
  CheckSquare,
  Ticket,
  Flag,
  Gauge,
  AlertTriangle,
  Users,
  UserCog,
  Wallet,
  FileText,
  Stamp,
  BarChart3,
  Bell,
  Settings,
  Shield,
  AppWindow,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  key: string
  path: string
  icon: LucideIcon
  section?: 'main' | 'delivery' | 'governance' | 'system'
}

export const navItems: NavItem[] = [
  { key: 'executive', path: '/executive', icon: LayoutDashboard, section: 'main' },
  /** Writers land on /manage (full hub). View-only roles use /projects. */
  { key: 'projects', path: '/projects', icon: FolderKanban, section: 'main' },
  { key: 'manage', path: '/manage', icon: FolderKanban, section: 'main' },
  { key: 'teams', path: '/teams', icon: UserCog, section: 'main' },
  { key: 'appsCatalog', path: '/apps-catalog', icon: AppWindow, section: 'main' },
  { key: 'roadmap', path: '/roadmap', icon: Map, section: 'main' },
  { key: 'gantt', path: '/gantt', icon: GanttChartSquare, section: 'delivery' },
  { key: 'tasks', path: '/tasks', icon: CheckSquare, section: 'delivery' },
  { key: 'tickets', path: '/tickets', icon: Ticket, section: 'delivery' },
  { key: 'milestones', path: '/milestones', icon: Flag, section: 'delivery' },
  { key: 'sla', path: '/sla', icon: Gauge, section: 'delivery' },
  { key: 'risks', path: '/risks', icon: AlertTriangle, section: 'delivery' },
  { key: 'resources', path: '/resources', icon: Users, section: 'delivery' },
  { key: 'budget', path: '/budget', icon: Wallet, section: 'governance' },
  { key: 'documents', path: '/documents', icon: FileText, section: 'governance' },
  { key: 'approvals', path: '/approvals', icon: Stamp, section: 'governance' },
  { key: 'reports', path: '/reports', icon: BarChart3, section: 'governance' },
  { key: 'notifications', path: '/notifications', icon: Bell, section: 'system' },
  { key: 'admin', path: '/admin', icon: Shield, section: 'system' },
  { key: 'settings', path: '/settings', icon: Settings, section: 'system' },
]
