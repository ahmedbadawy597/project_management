import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDomain } from '@/api/useDomain'
import { PageError, PageLoading } from '@/components/shared/PageStates'
import { useUploadDocument } from '@/api/hooks'
import { useAuth } from '@/auth/AuthProvider'
import { personName } from '@/data/selectors'
import { formatDate } from '@/lib/utils'

export function DocumentsPage() {
  const { t } = useTranslation()
  const { state, language, isLoading, isError, refetch } = useDomain()
  const { can } = useAuth()
  const upload = useUploadDocument()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState('prj-001')

  const categories = useMemo(
    () => ['all', ...new Set((state?.documents ?? []).map((d) => d.category))],
    [state?.documents],
  )
  const rows = (state?.documents ?? []).filter((d) => {
    const matchQ = !q || d.name.toLowerCase().includes(q.toLowerCase())
    const matchC = category === 'all' || d.category === category
    return matchQ && matchC
  })

  if (isLoading || !state) return <PageLoading />
  if (isError) return <PageError onRetry={() => void refetch()} />

  return (
    <div>
      <PageHeader
        title={t('documents.title')}
        description={t('documents.subtitle')}
        actions={
          can('documents:upload') ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="w-48"
                placeholder={t('documents.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <select
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </select>
              <Button
                disabled={!name.trim() || upload.isPending}
                onClick={() => {
                  upload.mutate(
                    { projectId, name: name.trim(), category: 'Governance', size: '120 KB' },
                    {
                      onSuccess: () => {
                        toast.success(t('documents.uploadStub'))
                        setName('')
                      },
                      onError: (e) => toast.error(e instanceof Error ? e.message : t('common.failed')),
                    },
                  )
                }}
              >
                {t('common.upload')}
              </Button>
            </div>
          ) : undefined
        }
      />
      <p className="mb-3 text-xs text-muted">{t('common.downloadUnavailable')}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="w-64"
          placeholder={t('documents.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? t('documents.allCategories') : c}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-start">{t('common.name')}</th>
              <th className="px-3 py-2 text-start">{t('common.project')}</th>
              <th className="px-3 py-2 text-start">{t('common.category')}</th>
              <th className="px-3 py-2 text-start">{t('documents.uploadedBy')}</th>
              <th className="px-3 py-2 text-start">{t('common.date')}</th>
              <th className="px-3 py-2 text-start">{t('common.size')}</th>
              <th className="px-3 py-2 text-start">{t('common.version')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-3 py-3 font-medium text-navy">{d.name}</td>
                <td className="px-3 py-3">{state.projects.find((p) => p.id === d.projectId)?.code}</td>
                <td className="px-3 py-3">{d.category}</td>
                <td className="px-3 py-3">{personName(state, d.uploadedBy, language)}</td>
                <td className="px-3 py-3">{formatDate(d.uploadedAt)}</td>
                <td className="px-3 py-3">{d.size}</td>
                <td className="px-3 py-3">{d.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
