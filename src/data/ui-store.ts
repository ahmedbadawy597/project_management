import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Density = 'comfortable' | 'compact'

interface UiState {
  language: 'en' | 'ar'
  sidebarCollapsed: boolean
  density: Density
  setLanguage: (lang: 'en' | 'ar') => void
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setDensity: (d: Density) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      language: 'ar',
      sidebarCollapsed: false,
      density: 'comfortable',
      setLanguage: (language) => {
        document.documentElement.lang = language
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
        set({ language })
      },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setDensity: (density) => {
        document.documentElement.dataset.density = density
        set({ density })
      },
    }),
    {
      name: 'awqaf-ppm-ui-v2-ar',
      partialize: (s) => ({
        language: s.language,
        sidebarCollapsed: s.sidebarCollapsed,
        density: s.density,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        document.documentElement.lang = state.language
        document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.dataset.density = state.density
      },
    },
  ),
)

/** @deprecated Use useUiStore for chrome; use API hooks for domain data */
export const useAppStore = useUiStore
