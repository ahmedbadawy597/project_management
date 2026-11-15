/** Cross-tab / live chat sync for tickets. */

export type ChatSyncEvent =
  | {
      type: 'ticket-comment'
      ticketId: string
      commentId: string
      authorId: string
      authorName: string
      authorNameAr: string
      body: string
      title: string
      titleAr: string
      at: string
    }
  | {
      type: 'ticket-created'
      ticketId: string
      title: string
      titleAr: string
      authorId: string
      at: string
    }

const CHANNEL = 'awqaf-ticket-chat-v1'
const PING_KEY = 'awqaf-ticket-chat-ping'

let channel: BroadcastChannel | null = null

function getChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null
  if (!channel) channel = new BroadcastChannel(CHANNEL)
  return channel
}

export function publishChatEvent(event: ChatSyncEvent) {
  getChannel()?.postMessage(event)
  try {
    localStorage.setItem(PING_KEY, JSON.stringify({ ...event, _t: Date.now() }))
  } catch {
    /* ignore quota */
  }
}

export function subscribeChatEvents(handler: (event: ChatSyncEvent) => void) {
  const ch = getChannel()
  const onMessage = (e: MessageEvent<ChatSyncEvent>) => {
    if (e?.data?.type) handler(e.data)
  }
  ch?.addEventListener('message', onMessage)

  const onStorage = (e: StorageEvent) => {
    if (e.key !== PING_KEY || !e.newValue) return
    try {
      const parsed = JSON.parse(e.newValue) as ChatSyncEvent & { _t?: number }
      if (parsed?.type) handler(parsed)
    } catch {
      /* ignore */
    }
  }
  window.addEventListener('storage', onStorage)

  return () => {
    ch?.removeEventListener('message', onMessage)
    window.removeEventListener('storage', onStorage)
  }
}
