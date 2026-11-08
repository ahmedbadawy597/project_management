import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useDeleteTask, usePeople, useProjects, useUpdateTaskStatus, useUpsertTask, useWbs } from '@/api/hooks'
import { useAuth } from '@/auth/AuthProvider'
import { useUiStore } from '@/data/ui-store'
import type { Priority, TaskStatus, WbsItem } from '@/data/types'
import { formatDate } from '@/lib/utils'
import { personName } from '@/data/selectors'

const STATUSES: TaskStatus[] = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Blocked', 'Completed']

const schema = z.object({
  name: z.string().min(3),
  nameAr: z.string().min(2),
  projectId: z.string().min(1),
  status: z.string(),
  priority: z.string(),
  start: z.string(),
  end: z.string(),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
})

type FormValues = z.infer<typeof schema>

export function TaskBoard({ projectId }: { projectId?: string }) {
  const { t } = useTranslation()
  const language = useUiStore((s) => s.language)
  const { can } = useAuth()
  const wbsQuery = useWbs(projectId)
  const projectsQuery = useProjects()
  const peopleQuery = usePeople()
  const upsert = useUpsertTask()
  const updateStatus = useUpdateTaskStatus()
  const remove = useDeleteTask()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<WbsItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      name: '',
      nameAr: '',
      projectId: projectId ?? 'prj-001',
      status: 'To Do',
      priority: 'Medium',
      start: '2026-11-05',
      end: '2026-11-20',
      description: '',
      assigneeId: 'p-dev1',
      estimatedHours: 40,
    },
  })

  const tasks = useMemo(
    () => (wbsQuery.data ?? []).filter((w) => w.type === 'task'),
    [wbsQuery.data],
  )
  const projects = projectsQuery.data ?? []
  const peopleState = { people: peopleQuery.data ?? [] }
  const canWrite = can('tasks:write')

  if (wbsQuery.isLoading) return <PageLoading label={t('common.loading')} />
  if (wbsQuery.isError) return <PageError onRetry={() => void wbsQuery.refetch()} />

  const openCreate = () => {
    setEditing(null)
    form.reset({
      name: '',
      nameAr: '',
      projectId: projectId ?? 'prj-001',
      status: 'To Do',
      priority: 'Medium',
      start: '2026-11-05',
      end: '2026-11-20',
      description: '',
      assigneeId: 'p-dev1',
      estimatedHours: 40,
    })
    setOpen(true)
  }

  const openEdit = (task: WbsItem) => {
    setEditing(task)
    form.reset({
      name: task.name,
      nameAr: task.nameAr,
      projectId: task.projectId,
      status: String(task.status),
      priority: task.priority ?? 'Medium',
      start: task.start,
      end: task.end,
      description: task.description ?? '',
      assigneeId: task.assigneeId,
      estimatedHours: task.estimatedHours,
    })
    setOpen(true)
  }

  const onSubmit = (values: FormValues) => {
    const id = editing?.id ?? `w-new-${Date.now()}`
    upsert.mutate(
      {
        id,
        projectId: values.projectId,
        parentId: editing?.parentId,
        name: values.name,
        nameAr: values.nameAr,
        type: 'task',
        start: values.start,
        end: values.end,
        baselineStart: editing?.baselineStart ?? values.start,
        baselineEnd: editing?.baselineEnd ?? values.end,
        progress: values.status === 'Completed' ? 100 : (editing?.progress ?? 0),
        dependencies: editing?.dependencies ?? [],
        assigneeId: values.assigneeId,
        status: values.status as TaskStatus,
        priority: values.priority as Priority,
        estimatedHours: values.estimatedHours,
        actualHours: editing?.actualHours ?? 0,
        description: values.description,
      },
      {
        onSuccess: () => {
          toast.success(t('common.save'))
          setOpen(false)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : t('common.failed')),
      },
    )
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t('tasks.create')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? t('tasks.edit') : t('tasks.create')}</DialogTitle>
              </DialogHeader>
              <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
                <Input placeholder={t('tasks.titlePlaceholder')} {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
                )}
                <Input placeholder={t('tasks.titleArPlaceholder')} {...form.register('nameAr')} />
                <Textarea placeholder={t('tasks.descriptionPlaceholder')} {...form.register('description')} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" {...form.register('start')} />
                  <Input type="date" {...form.register('end')} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tasks.statusPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`status.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={form.watch('priority')} onValueChange={(v) => form.setValue('priority', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tasks.priorityPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {['Low', 'Medium', 'High', 'Critical'].map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`status.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select
                  value={form.watch('assigneeId') ?? ''}
                  onValueChange={(v) => form.setValue('assigneeId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('tasks.assigneePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(peopleQuery.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {language === 'ar' ? p.nameAr : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!projectId && (
                  <Select value={form.watch('projectId')} onValueChange={(v) => form.setValue('projectId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tasks.projectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects
                        .filter((p) => p.status === 'Active')
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={upsert.isPending}>
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">{t('tasks.kanban')}</TabsTrigger>
          <TabsTrigger value="list">{t('tasks.list')}</TabsTrigger>
          <TabsTrigger value="calendar">{t('tasks.calendar')}</TabsTrigger>
        </TabsList>
        <TabsContent value="kanban">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {STATUSES.map((status) => (
              <div key={status} className="rounded-xl border border-border bg-bg/60 p-2">
                <p className="mb-2 px-1 text-xs font-semibold text-muted">{t(`status.${status}`)}</p>
                <div className="space-y-2">
                  {tasks
                    .filter((task) => task.status === status)
                    .map((task) => (
                      <button
                        key={task.id}
                        onClick={() => canWrite && openEdit(task)}
                        className="w-full rounded-lg border border-border bg-surface p-3 text-start shadow-sm hover:border-royal/40"
                      >
                        <p className="text-sm font-medium text-navy">
                          {language === 'ar' ? task.nameAr : task.name}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          {projects.find((p) => p.id === task.projectId)?.code} · {formatDate(task.end)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <StatusBadge status={task.priority ?? 'Medium'} />
                          {canWrite && (
                            <select
                              className="rounded border border-border bg-surface px-1 text-[10px]"
                              value={String(task.status)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateStatus.mutate({
                                  id: task.id,
                                  status: e.target.value as TaskStatus,
                                })
                              }
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {t(`status.${s}`)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="list">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-bg text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-start">Task</th>
                  <th className="px-3 py-2 text-start">Project</th>
                  <th className="px-3 py-2 text-start">Assignee</th>
                  <th className="px-3 py-2 text-start">Priority</th>
                  <th className="px-3 py-2 text-start">Due</th>
                  <th className="px-3 py-2 text-start">Status</th>
                  <th className="px-3 py-2 text-start">Effort</th>
                  {canWrite && <th className="px-3 py-2 text-start" />}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <button
                        className="font-medium text-royal hover:underline"
                        onClick={() => canWrite && openEdit(task)}
                      >
                        {language === 'ar' ? task.nameAr : task.name}
                      </button>
                    </td>
                    <td className="px-3 py-2">{projects.find((p) => p.id === task.projectId)?.code}</td>
                    <td className="px-3 py-2">
                      {task.assigneeId ? personName(peopleState, task.assigneeId, language) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={task.priority ?? 'Medium'} />
                    </td>
                    <td className="px-3 py-2">{formatDate(task.end)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {task.actualHours ?? 0}/{task.estimatedHours ?? 0}h
                    </td>
                    {canWrite && (
                      <td className="px-3 py-2">
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(task.id)}>
                          {t('common.delete')}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="calendar">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => canWrite && openEdit(task)}
                className="rounded-lg border border-border bg-surface p-3 text-start"
              >
                <p className="text-xs text-muted">{formatDate(task.end)}</p>
                <p className="mt-1 text-sm font-medium text-navy">
                  {language === 'ar' ? task.nameAr : task.name}
                </p>
                <div className="mt-2">
                  <StatusBadge status={task.status} />
                </div>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title={t('common.delete')}
        description={t('tasks.deleteBody')}
        tone="danger"
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        busy={remove.isPending}
        onConfirm={() => {
          if (!deleteId) return
          remove.mutate(deleteId, {
            onSuccess: () => {
              toast.success(t('common.delete'))
              setDeleteId(null)
            },
          })
        }}
      />
    </div>
  )
}
