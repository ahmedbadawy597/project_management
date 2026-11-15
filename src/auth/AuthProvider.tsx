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
  login: (username: string, password: string) => Promise<AuthUser>
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthUser>
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
    async (username: string, password: string) => {
      const res = await api.login(username, password)
      setSessionToken(res.token)
      setUser(res.user)
      await qc.invalidateQueries()
      return res.user
    },
    [qc],
  )

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const updated = await api.changePassword(currentPassword, newPassword)
    setUser(updated)
    return updated
  }, [])

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
    () => ({ user, loading, login, changePassword, logout, can }),
    [user, loading, login, changePassword, logout, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
