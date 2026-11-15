import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/auth/AuthProvider'
import type { Ticket } from '@/data/types'
import { showDesktopNotification } from '@/lib/desktop-notify'

/**
 * When live polling fetches a ticket with new comments from someone else,
 * show a desktop notification (covers multi-browser / real API sessions).
 */
export function useIncomingChatWatch(ticket?: Ticket | null) {
  const { user } = useAuth()
  const { i18n } = useTranslation()
  const language = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const myId = user?.id
  const lastSeen = useRef<string | null>(null)
  const ticketIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!ticket?.id) return
    if (ticketIdRef.current !== ticket.id) {
      ticketIdRef.current = ticket.id
      const comments = ticket.comments ?? []
      lastSeen.current = comments[comments.length - 1]?.id ?? `open-${ticket.id}`
      return
    }

    const comments = ticket.comments ?? []
    const latest = comments[comments.length - 1]
    if (!latest || latest.id === lastSeen.current) return
    lastSeen.current = latest.id

    if (latest.authorId === myId) return

    // Skip notify if user is focused on this chat pane
    if (document.visibilityState === 'visible' && document.hasFocus()) return

    const title = language === 'ar' ? ticket.titleAr || ticket.title : ticket.title
    void showDesktopNotification({
      title: language === 'ar' ? `رسالة جديدة — ${title}` : `New message — ${title}`,
      body: latest.body.slice(0, 180),
      url: `/tickets?id=${ticket.id}`,
      tag: `ticket-${ticket.id}`,
    })
  }, [ticket, myId, language])
}
