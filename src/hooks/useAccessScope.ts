import { useMemo } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { resolveAccessScope, type AccessScope } from '@/auth/access-scope'
import { useDomain } from '@/api/useDomain'

/** Current user's project/app membership scope (already reflected in bootstrap). */
export function useAccessScope(): AccessScope & {
  personId: string | undefined
  isScoped: boolean
} {
  const { user } = useAuth()
  const { state } = useDomain()

  return useMemo(() => {
    if (!user || !state) {
      return {
        mode: 'scoped' as const,
        projectIds: new Set<string>(),
        appIds: new Set<string>(),
        personId: user?.id,
        isScoped: true,
      }
    }
    const scope = resolveAccessScope(user.id, user.role, state)
    return {
      ...scope,
      personId: user.id,
      isScoped: scope.mode === 'scoped',
    }
  }, [user, state])
}
