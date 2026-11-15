import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Capability } from './permissions'
import { useAuth } from './AuthProvider'
import { EmptyState } from '@/components/shared/EmptyState'
import { ShieldOff } from 'lucide-react'

export function RequireCapability({
  capability,
  children,
  fallback = 'redirect',
}: {
  capability: Capability
  children: React.ReactNode
  fallback?: 'redirect' | 'empty'
}) {
  const { can } = useAuth()
  const { t } = useTranslation()
  if (can(capability)) return children
  if (fallback === 'empty') {
    return (
      <EmptyState
        icon={ShieldOff}
        title={t('common.accessRestricted')}
        description={t('common.accessRestrictedBody')}
      />
    )
  }
  // Land on projects hub — every authenticated role can view projects (scoped by membership).
  return <Navigate to="/projects" replace />
}
