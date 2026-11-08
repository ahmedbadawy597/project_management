import { useMemo } from 'react'
import { useBootstrap } from './hooks'
import { useUiStore } from '@/data/ui-store'
import type { DomainState } from '@/data/selectors'

/** Convenience hook: bootstrap domain + UI language for migrated pages. */
export function useDomain() {
  const query = useBootstrap()
  const language = useUiStore((s) => s.language)

  const state = useMemo(() => {
    if (!query.data) return null
    return query.data as DomainState
  }, [query.data])

  return {
    ...query,
    state,
    language,
  }
}
