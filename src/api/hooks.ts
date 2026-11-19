import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ApprovalStatus,
  BudgetTransaction,
  Milestone,
  Project,
  ProjectApp,
  Risk,
  TaskStatus,
  WbsItem,
} from '@/data/types'
import {
  api,
  queryKeys,
  type CreatePersonInput,
  type CreateProjectInput,
  type UpdatePersonInput,
} from './endpoints'
import { publishChatEvent } from '@/lib/chat-sync'

export function useBootstrap(enabled = true) {
  return useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: api.bootstrap,
    enabled,
    staleTime: 30_000,
  })
}

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: api.projects })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => api.project(id),
    enabled: Boolean(id),
  })
}

export function usePeople() {
  return useQuery({ queryKey: queryKeys.people, queryFn: api.people })
}

export function useWbs(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.wbs(projectId),
    queryFn: () => api.wbs(projectId),
  })
}

export function useMilestones(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.milestones(projectId),
    queryFn: () => api.milestones(projectId),
  })
}

export function useSlas(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.slas(projectId),
    queryFn: () => api.slas(projectId),
  })
}

export function useRisks(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.risks(projectId),
    queryFn: () => api.risks(projectId),
  })
}

export function useTransactions(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.transactions(projectId),
    queryFn: () => api.transactions(projectId),
  })
}

export function useApprovals(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.approvals(projectId),
    queryFn: () => api.approvals(projectId),
  })
}

export function useDocuments(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.documents(projectId),
    queryFn: () => api.documents(projectId),
  })
}

export function useActivities(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.activities(projectId),
    queryFn: () => api.activities(projectId),
  })
}

export function useNotifications(live = false) {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.notifications,
    refetchInterval: live ? 4000 : false,
    refetchIntervalInBackground: live,
  })
}

function invalidateDomain(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.bootstrap })
  void qc.invalidateQueries({ queryKey: ['projects'] })
  void qc.invalidateQueries({ queryKey: ['apps'] })
  void qc.invalidateQueries({ queryKey: ['app-dashboard'] })
  void qc.invalidateQueries({ queryKey: ['wbs'] })
  void qc.invalidateQueries({ queryKey: ['approvals'] })
  void qc.invalidateQueries({ queryKey: ['risks'] })
  void qc.invalidateQueries({ queryKey: ['milestones'] })
  void qc.invalidateQueries({ queryKey: ['transactions'] })
  void qc.invalidateQueries({ queryKey: ['documents'] })
  void qc.invalidateQueries({ queryKey: ['activities'] })
  void qc.invalidateQueries({ queryKey: ['notifications'] })
  void qc.invalidateQueries({ queryKey: ['slas'] })
  void qc.invalidateQueries({ queryKey: ['people'] })
}

export function useApps(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.apps(projectId),
    queryFn: () => api.apps(projectId),
  })
}

export function useAppDashboard(appId?: string) {
  return useQuery({
    queryKey: ['app-dashboard', appId ?? ''],
    queryFn: () => api.appDashboard(appId!),
    enabled: Boolean(appId),
    staleTime: 15_000,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.createProject(input),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useImportProjectPack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pack: import('@/lib/project-pack').ParsedProjectPack) => api.importProjectPack(pack),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Project> }) =>
      api.updateProject(id, patch),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useUpsertApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (app: ProjectApp & { members?: import('./endpoints').AppMemberInput[] }) =>
      api.upsertApp(app),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useDeleteApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteApp(id),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useReorderApps() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.reorderApps(orderedIds),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useUpsertTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (task: WbsItem) => api.upsertTask(task),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api.updateTaskStatus(id, status),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useDecideApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      comment,
    }: {
      id: string
      status: Exclude<ApprovalStatus, 'Pending'>
      comment?: string
    }) => api.decideApproval(id, status, comment),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useUpsertRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (risk: Risk) => api.upsertRisk(risk),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useUpsertMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (m: Milestone) => api.upsertMilestone(m),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useAddTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tx: BudgetTransaction) => api.addTransaction(tx),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.uploadDocument,
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}

export function useResetDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.resetDemo(),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useCreatePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePersonInput) => api.createPerson(input),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useUpdatePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdatePersonInput }) =>
      api.updatePerson(id, patch),
    onSuccess: () => invalidateDomain(qc),
  })
}

export function useProjectMembers(projectId?: string) {
  return useQuery({
    queryKey: ['project-members', projectId ?? ''],
    queryFn: () => api.projectMembers(projectId!),
    enabled: Boolean(projectId),
  })
}

export function useSetProjectMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, personIds }: { projectId: string; personIds: string[] }) =>
      api.setProjectMembers(projectId, personIds),
    onSuccess: (_data, vars) => {
      invalidateDomain(qc)
      void qc.invalidateQueries({ queryKey: ['project-members', vars.projectId] })
    },
  })
}

export function useAppAccess(appId?: string) {
  return useQuery({
    queryKey: ['app-access', appId ?? ''],
    queryFn: () => api.appAccess(appId!),
    enabled: Boolean(appId),
  })
}

export function useSetAppAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ appId, personIds }: { appId: string; personIds: string[] }) =>
      api.setAppAccess(appId, personIds),
    onSuccess: (_data, vars) => {
      invalidateDomain(qc)
      void qc.invalidateQueries({ queryKey: ['app-access', vars.appId] })
      void qc.invalidateQueries({ queryKey: ['app-members', vars.appId] })
    },
  })
}

export function useAppMembers(appId?: string) {
  return useQuery({
    queryKey: ['app-members', appId ?? ''],
    queryFn: () => api.appMembers(appId!),
    enabled: Boolean(appId),
  })
}

export function useSetAppMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      appId,
      members,
    }: {
      appId: string
      members: import('./endpoints').AppMemberInput[]
    }) => api.setAppMembers(appId, members),
    onSuccess: (_data, vars) => {
      invalidateDomain(qc)
      void qc.invalidateQueries({ queryKey: ['app-members', vars.appId] })
    },
  })
}

export function useTickets(filters: import('./endpoints').TicketFilters = {}, live = false) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => api.tickets(filters),
    refetchInterval: live ? 2000 : false,
    refetchIntervalInBackground: live,
  })
}

export function useTicket(id?: string, live = false) {
  return useQuery({
    queryKey: ['ticket', id ?? ''],
    queryFn: () => api.ticket(id!),
    enabled: Boolean(id),
    refetchInterval: live && id ? 1500 : false,
    refetchIntervalInBackground: live,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: import('./endpoints').CreateTicketInput) => api.createTicket(input),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
      invalidateDomain(qc)
      publishChatEvent({
        type: 'ticket-created',
        ticketId: created.id,
        title: created.title,
        titleAr: created.titleAr,
        authorId: created.reporterId,
        at: created.createdAt,
      })
    },
  })
}

export function useUpdateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<import('@/data/types').Ticket> }) =>
      api.updateTicket(id, patch),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
      void qc.invalidateQueries({ queryKey: ['ticket', vars.id] })
    },
  })
}

export function useAddTicketComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.addTicketComment(id, body),
    onSuccess: (ticket, vars) => {
      void qc.setQueryData(['ticket', vars.id], ticket)
      void qc.invalidateQueries({ queryKey: ['ticket', vars.id] })
      void qc.invalidateQueries({ queryKey: ['tickets'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
      const last = ticket.comments?.[ticket.comments.length - 1]
      if (!last) return
      const bootstrap = qc.getQueryData(queryKeys.bootstrap) as
        | { people?: Array<{ id: string; name: string; nameAr: string }> }
        | undefined
      const author = bootstrap?.people?.find((p) => p.id === last.authorId)
      publishChatEvent({
        type: 'ticket-comment',
        ticketId: ticket.id,
        commentId: last.id,
        authorId: last.authorId,
        authorName: author?.name ?? 'Team',
        authorNameAr: author?.nameAr ?? author?.name ?? 'الفريق',
        body: last.body,
        title: ticket.title,
        titleAr: ticket.titleAr,
        at: last.createdAt,
      })
    },
  })
}
