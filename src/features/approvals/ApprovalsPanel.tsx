import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { useApprovals, useDecideApproval, usePeople, useProjects } from '@/api/hooks'
import { useAuth } from '@/auth/AuthProvider'
import { useUiStore } from '@/data/ui-store'
import { personName } from '@/data/selectors'
import { formatDate } from '@/lib/utils'
import type { ApprovalStatus } from '@/data/types'

export function ApprovalsPanel({ projectId }: { projectId?: string }) {
  const { t } = useTranslation()
  const language = useUiStore((s) => s.language)
  const { can } = useAuth()
  const approvalsQuery = useApprovals(projectId)
  const projectsQuery = useProjects()
  const peopleQuery = usePeople()
  const decide = useDecideApproval()
  const [comment, setComment] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<{
    id: string
    status: Exclude<ApprovalStatus, 'Pending'>
  } | null>(null)

  if (approvalsQuery.isLoading || projectsQuery.isLoading || peopleQuery.isLoading) {
    return <PageLoading label={t('common.loading')} />
  }
  if (approvalsQuery.isError) {
    return <PageError onRetry={() => void approvalsQuery.refetch()} />
  }

  const rows = approvalsQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const peopleState = { people: peopleQuery.data ?? [] }
  const canDecide = can('approvals:decide')

  const runDecide = () => {
    if (!pending) return
    const c = comment[pending.id]?.trim()
    if (pending.status === 'Rejected' && !c) {
      toast.error(t('approvals.commentRequired'))
      return
    }
    decide.mutate(
      { id: pending.id, status: pending.status, comment: c },
      {
        onSuccess: () => {
          toast.success(pending.status === 'Approved' ? t('common.approve') : t('common.reject'))
          setPending(null)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : t('common.failed')),
      },
    )
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-sm text-muted">{t('common.noResults')}</p>
      )}
      {rows.map((a) => {
        const project = projects.find((p) => p.id === a.projectId)
        return (
          <div key={a.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={a.status} />
                  <StatusBadge status={a.type} />
                  <span className="text-xs text-muted">{project?.code}</span>
                </div>
                <h3 className="text-sm font-semibold text-navy">
                  {language === 'ar' ? a.titleAr : a.title}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {personName(peopleState, a.requesterId, language)} ·{' '}
                  {formatDate(a.submittedAt, 'dd MMM yyyy HH:mm')}
                </p>
              </div>
              {a.status === 'Pending' && canDecide && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="teal"
                    onClick={() => setPending({ id: a.id, status: 'Approved' })}
                  >
                    {t('common.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setPending({ id: a.id, status: 'Rejected' })}
                  >
                    {t('common.reject')}
                  </Button>
                </div>
              )}
            </div>
            {a.status === 'Pending' && canDecide && (
              <Textarea
                className="mt-3"
                placeholder={t('common.comment')}
                value={comment[a.id] ?? ''}
                onChange={(e) => setComment((c) => ({ ...c, [a.id]: e.target.value }))}
              />
            )}
            {a.comments.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {a.comments.map((c, i) => (
                  <p key={i} className="text-xs text-muted">
                    <strong className="text-navy">
                      {personName(peopleState, c.authorId, language)}
                    </strong>
                    : {c.text} · {formatDate(c.at, 'dd MMM HH:mm')}
                  </p>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.status === 'Rejected' ? t('approvals.confirmReject') : t('approvals.confirmApprove')
        }
        tone={pending?.status === 'Rejected' ? 'danger' : 'teal'}
        confirmLabel={pending?.status === 'Rejected' ? t('common.reject') : t('common.approve')}
        cancelLabel={t('common.cancel')}
        comment={pending ? comment[pending.id] ?? '' : ''}
        onCommentChange={(v) =>
          pending && setComment((c) => ({ ...c, [pending.id]: v }))
        }
        commentRequired={pending?.status === 'Rejected'}
        commentPlaceholder={t('common.comment')}
        onConfirm={runDecide}
        busy={decide.isPending}
      />
    </div>
  )
}
