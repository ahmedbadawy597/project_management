const SW_URL = '/sw-notify.js'
/** Narrow scope so this SW coexists with MSW's mock worker. */
const SW_SCOPE = '/notify/'
const PREF_KEY = 'awqaf-desktop-notify'

export type DesktopNotifyPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

export function notificationPreference(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function isNotifyEnabled() {
  try {
    return localStorage.getItem(PREF_KEY) === '1' && Notification.permission === 'granted'
  } catch {
    return false
  }
}

export async function registerNotifyServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
  } catch {
    return null
  }
}

export async function enableDesktopNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  await registerNotifyServiceWorker()
  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()
  if (permission === 'granted') {
    try {
      localStorage.setItem(PREF_KEY, '1')
    } catch {
      /* ignore */
    }
  }
  return permission
}

export async function showDesktopNotification(payload: DesktopNotifyPayload) {
  if (!isNotifyEnabled()) return false

  const data = {
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/tickets',
    tag: payload.tag ?? 'awqaf-chat',
  }

  // Prefer SW so alerts work when the tab is backgrounded / minimized.
  if ('serviceWorker' in navigator) {
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ??
        (await registerNotifyServiceWorker())
      if (reg) {
        await reg.showNotification(data.title, {
          body: data.body,
          tag: data.tag,
          data: { url: data.url },
          icon: '/favicon.svg',
          badge: '/favicon.svg',
        })
        return true
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const n = new Notification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: '/favicon.svg',
      data: { url: data.url },
    })
    n.onclick = () => {
      window.focus()
      if (data.url) window.location.assign(data.url)
      n.close()
    }
    return true
  } catch {
    return false
  }
}
