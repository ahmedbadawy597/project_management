import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/app/router'
import { useEffect } from 'react'
import { useUiStore } from '@/data/ui-store'
import { AuthProvider } from '@/auth/AuthProvider'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import i18n from '@/i18n'

export default function App() {
  const language = useUiStore((s) => s.language)
  const density = useUiStore((s) => s.density)

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.dataset.density = density
    void i18n.changeLanguage(language)
  }, [language, density])

  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </ErrorBoundary>
  )
}
