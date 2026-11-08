import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, type AuthUser } from '@/api/endpoints'
import { getSessionToken, setSessionToken } from '@/api/client'
import type { Capability } from './permissions'
import { hasCapability } from './permissions'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (personaId: string) => Promise<void>
  logout: () => void
  can: (capability: Capability) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getSessionToken()
    if (!token) {
      setLoading(false)
      return
    }
    void api
      .me()
      .then(setUser)
      .catch(() => {
        setSessionToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(
    async (personaId: string) => {
      const res = await api.login(personaId)
      setSessionToken(res.token)
      setUser(res.user)
      await qc.invalidateQueries()
    },
    [qc],
  )

  const logout = useCallback(() => {
    setSessionToken(null)
    setUser(null)
    qc.clear()
  }, [qc])

  const can = useCallback(
    (capability: Capability) => (user ? hasCapability(user.role, capability) : false),
    [user],
  )

  const value = useMemo(
    () => ({ user, loading, login, logout, can }),
    [user, loading, login, logout, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
