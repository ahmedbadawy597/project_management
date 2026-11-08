import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { TaskBoard } from './TaskBoard'

export function TasksPage() {
  const { t } = useTranslation()
  return (
    <div>
      <PageHeader title={t('tasks.title')} description={t('tasks.subtitle')} />
      <TaskBoard />
    </div>
  )
}
