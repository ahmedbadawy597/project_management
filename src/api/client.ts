export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

const SESSION_KEY = 'awqaf-ppm-session'

export function getSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY)
}

export function setSessionToken(token: string | null) {
  if (token) sessionStorage.setItem(SESSION_KEY, token)
  else sessionStorage.removeItem(SESSION_KEY)
}

export function getApiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api'
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getSessionToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers })
  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = undefined
    }
    const message =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: string }).message)
        : res.statusText || 'Request failed'
    throw new ApiError(res.status, message, body)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
