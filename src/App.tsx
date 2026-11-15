import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { DirectionProvider } from '@radix-ui/react-direction'
import { router } from '@/app/router'
import { useEffect } from 'react'
import { useUiStore } from '@/data/ui-store'
import { AuthProvider } from '@/auth/AuthProvider'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import i18n from '@/i18n'

export default function App() {
  const language = useUiStore((s) => s.language)
  const density = useUiStore((s) => s.density)
  const dir = language === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = dir
    document.documentElement.dataset.density = density
    void i18n.changeLanguage(language)
  }, [language, density, dir])

  return (
    <ErrorBoundary>
      <DirectionProvider dir={dir}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster richColors position={dir === 'rtl' ? 'top-left' : 'top-right'} dir={dir} />
        </AuthProvider>
      </DirectionProvider>
    </ErrorBoundary>
  )
}
