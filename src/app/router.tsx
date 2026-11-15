import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { RequireAuth } from '@/auth/RequireAuth'
import { RequireCapability } from '@/auth/RequireCapability'
import { RouteErrorFallback } from '@/components/shared/ErrorBoundary'
import { LoginPage } from '@/features/auth/LoginPage'
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage'
import { ExecutivePage } from '@/features/executive/ExecutivePage'
import { PortfolioPage } from '@/features/portfolio/PortfolioPage'
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage'
import { GanttPage } from '@/features/gantt/GanttPage'
import { SlaPage } from '@/features/sla/SlaPage'
import { MilestonesPage } from '@/features/milestones/MilestonesPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { TicketsPage } from '@/features/tickets/TicketsPage'
import { RisksPage } from '@/features/risks/RisksPage'
import { ResourcesPage } from '@/features/resources/ResourcesPage'
import { BudgetPage } from '@/features/finance/BudgetPage'
import { ApprovalsPage } from '@/features/approvals/ApprovalsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { DocumentsPage } from '@/features/documents/DocumentsPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { RoadmapPage } from '@/features/roadmap/RoadmapPage'
import { ManageProjectsPage } from '@/features/manage/ManageProjectsPage'
import { ManageProjectFormPage } from '@/features/manage/ManageProjectFormPage'
import { TeamsPage } from '@/features/teams/TeamsPage'
import { AppsCatalogPage } from '@/features/apps/AppsCatalogPage'
import { AppWorkspacePage } from '@/features/apps/AppWorkspacePage'

function guard(capability: Parameters<typeof RequireCapability>[0]['capability'], element: React.ReactNode) {
  return <RequireCapability capability={capability}>{element}</RequireCapability>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'executive', element: guard('executive:view', <ExecutivePage />) },
      { path: 'portfolio', element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: guard('projects:view', <PortfolioPage />) },
      { path: 'projects/:projectId', element: guard('projects:view', <ProjectDetailPage />) },
      { path: 'manage', element: guard('projects:write', <ManageProjectsPage />) },
      { path: 'manage/projects/new', element: guard('projects:write', <ManageProjectFormPage />) },
      { path: 'manage/projects/:projectId', element: guard('projects:write', <ManageProjectFormPage />) },
      { path: 'teams', element: guard('projects:write', <TeamsPage />) },
      { path: 'apps-catalog', element: guard('projects:view', <AppsCatalogPage />) },
      { path: 'apps/:appId', element: guard('projects:view', <AppWorkspacePage />) },
      { path: 'roadmap', element: guard('roadmap:view', <RoadmapPage />) },
      { path: 'gantt', element: guard('gantt:view', <GanttPage />) },
      { path: 'tasks', element: guard('tasks:write', <TasksPage />) },
      { path: 'tickets', element: guard('tasks:write', <TicketsPage />) },
      { path: 'milestones', element: guard('milestones:write', <MilestonesPage />) },
      { path: 'sla', element: guard('sla:view', <SlaPage />) },
      { path: 'risks', element: guard('risks:write', <RisksPage />) },
      { path: 'resources', element: guard('resources:view', <ResourcesPage />) },
      { path: 'budget', element: guard('budget:view', <BudgetPage />) },
      { path: 'documents', element: guard('documents:view', <DocumentsPage />) },
      { path: 'approvals', element: guard('approvals:view', <ApprovalsPage />) },
      { path: 'reports', element: guard('reports:view', <ReportsPage />) },
      { path: 'notifications', element: guard('notifications:view', <NotificationsPage />) },
      { path: 'admin', element: guard('admin:view', <AdminPage />) },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
