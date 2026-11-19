import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PendingImportSetup = {
  projectId: string
  projectCode: string
  importedAt: string
}

interface ImportSetupState {
  pending: PendingImportSetup[]
  markPending: (item: PendingImportSetup) => void
  clearPending: (projectId: string) => void
  isPending: (projectId: string) => boolean
}

export const useImportSetupStore = create<ImportSetupState>()(
  persist(
    (set, get) => ({
      pending: [],
      markPending: (item) =>
        set((s) => ({
          pending: [item, ...s.pending.filter((p) => p.projectId !== item.projectId)],
        })),
      clearPending: (projectId) =>
        set((s) => ({ pending: s.pending.filter((p) => p.projectId !== projectId) })),
      isPending: (projectId) => get().pending.some((p) => p.projectId === projectId),
    }),
    { name: 'awqaf-ppm-import-setup-v1' },
  ),
)
