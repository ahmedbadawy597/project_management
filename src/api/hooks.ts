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
import { api, queryKeys, type CreateProjectInput } from './endpoints'

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

export function useNotifications() {
  return useQuery({ queryKey: queryKeys.notifications, queryFn: api.notifications })
}

function invalidateDomain(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.bootstrap })
  void qc.invalidateQueries({ queryKey: ['projects'] })
  void qc.invalidateQueries({ queryKey: ['apps'] })
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

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.createProject(input),
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
    mutationFn: (app: ProjectApp) => api.upsertApp(app),
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
