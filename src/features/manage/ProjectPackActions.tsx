import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { useImportProjectPack } from '@/api/hooks'
import { useDomain } from '@/api/useDomain'
import {
  SAMPLE_FILE_NAME,
  TEMPLATE_FILE_NAME,
  EXPORT_FILE_PREFIX,
  buildEmptyTemplateWorkbook,
  buildSampleWorkbook,
  buildExportWorkbook,
  downloadWorkbook,
  isBlockingIssue,
  parseProjectPack,
  validateProjectPack,
} from '@/lib/project-pack'
import type { PackIssue } from '@/lib/project-pack'
import type { AppMember } from '@/data/types'

type Props = {
  /** When set, also show Export for that project */
  projectId?: string
  compact?: boolean
}

export function ProjectPackActions({ projectId, compact }: Props) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language?.startsWith('ar')
  const { state } = useDomain()
  const importPack = useImportProjectPack()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [issues, setIssues] = useState<PackIssue[]>([])

  const downloadTemplate = async () => {
    setBusy(true)
    try {
      await downloadWorkbook(await buildEmptyTemplateWorkbook(), TEMPLATE_FILE_NAME)
      toast.success(t('manage.packTemplateDownloaded'))
    } finally {
      setBusy(false)
    }
  }

  const downloadSample = async () => {
    setBusy(true)
    try {
      await downloadWorkbook(await buildSampleWorkbook(), SAMPLE_FILE_NAME)
      toast.success(t('manage.packSampleDownloaded'))
    } finally {
      setBusy(false)
    }
  }

  const exportProject = async () => {
    if (!state || !projectId) return
    const project = state.projects.find((p) => p.id === projectId)
    if (!project) {
      toast.error(t('manage.notFound'))
      return
    }
    setBusy(true)
    try {
      const apps = (state.apps ?? []).filter((a) => a.projectId === projectId)
      const projectMemberIds = state.projectMembers?.[projectId] ?? []
      const appMembers: Record<string, AppMember[]> = {}
      for (const app of apps) {
        appMembers[app.id] = (state.appMembers?.[app.id] ?? []).map((m) => ({
          personId: m.personId,
          role: m.role as AppMember['role'],
        }))
      }
      const wb = await buildExportWorkbook({
        project,
        apps,
        people: state.people,
        projectMemberIds,
        appMembers,
        wbs: state.wbs.filter((w) => w.projectId === projectId),
        milestones: state.milestones.filter((m) => m.projectId === projectId),
        risks: state.risks.filter((r) => r.projectId === projectId),
      })
      await downloadWorkbook(wb, `${EXPORT_FILE_PREFIX}${project.code}.xlsx`)
      toast.success(t('manage.packExported'))
    } finally {
      setBusy(false)
    }
  }

  const onPickFile = async (file: File | null) => {
    if (!file || !state) return
    setBusy(true)
    setIssues([])
    try {
      const buf = await file.arrayBuffer()
      const { pack, issues: parseIssues } = parseProjectPack(buf)
      if (!pack) {
        setIssues(parseIssues)
        toast.error(t('manage.packParseFailed'))
        return
      }
      const validation = validateProjectPack(pack, { people: state.people })
      const all = [...parseIssues, ...validation]
      const blocking = all.filter(isBlockingIssue)
      if (blocking.length) {
        setIssues(blocking)
        toast.error(t('manage.packValidationFailed', { count: blocking.length }))
        return
      }
      const soft = all.filter((i) => !isBlockingIssue(i))
      const res = await importPack.mutateAsync(pack)
      if (!res.ok) {
        setIssues(res.issues ?? [])
        toast.error(t('manage.packImportFailed'))
        return
      }
      setIssues(soft)
      const s = res.summary!
      toast.success(
        t('manage.packImportOk', {
          code: s.projectCode,
          apps: s.apps,
          tasks: s.scheduleItems,
          milestones: s.milestones,
          risks: s.risks,
        }),
      )
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'issues' in err.body) {
        const serverIssues = (err.body as { issues?: PackIssue[] }).issues ?? []
        setIssues(serverIssues)
        toast.error(t('manage.packValidationFailed', { count: serverIssues.length || 1 }))
      } else {
        toast.error(t('manage.packImportFailed'))
      }
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => void downloadTemplate()}
          disabled={busy}
        >
          <Download className="me-1.5 h-4 w-4" />
          {t('manage.downloadTemplate')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => void downloadSample()}
          disabled={busy}
        >
          <FileSpreadsheet className="me-1.5 h-4 w-4" />
          {t('manage.downloadSample')}
        </Button>
        <Button
          type="button"
          className="min-h-11"
          onClick={() => fileRef.current?.click()}
          disabled={busy || importPack.isPending}
        >
          <Upload className="me-1.5 h-4 w-4" />
          {t('manage.importPack')}
        </Button>
        {projectId ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => void exportProject()}
            disabled={busy}
          >
            <Download className="me-1.5 h-4 w-4" />
            {t('manage.exportPack')}
          </Button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {!compact ? (
        <p className="text-xs text-muted">{t('manage.packHint')}</p>
      ) : null}
      {issues.length > 0 ? (
        <ul className="max-h-40 overflow-auto rounded-xl border border-border/70 bg-bg/60 p-3 text-xs text-navy">
          {issues.slice(0, 12).map((issue, i) => (
            <li key={`${issue.sheet}-${issue.row ?? 0}-${i}`} className="mb-1 last:mb-0">
              <span className="font-semibold">{issue.sheet}</span>
              {issue.row ? ` #${issue.row}` : ''}: {isAr ? issue.messageAr : issue.message}
            </li>
          ))}
          {issues.length > 12 ? (
            <li className="text-muted">+{issues.length - 12}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
