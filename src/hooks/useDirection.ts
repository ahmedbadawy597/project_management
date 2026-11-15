import { useUiStore } from '@/data/ui-store'

export function useDirection() {
  const language = useUiStore((s) => s.language)
  const isRtl = language === 'ar'
  return {
    language,
    isRtl,
    dir: (isRtl ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  }
}
