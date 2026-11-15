import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/auth/AuthProvider'
import { subscribeChatEvents, type ChatSyncEvent } from '@/lib/chat-sync'
import { showDesktopNotification } from '@/lib/desktop-notify'

/**
 * Keeps ticket queries fresh across tabs/users and raises desktop notifications
 * for incoming chat messages when the current user is not the author.
 */
export function useLiveChatSync() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { i18n } = useTranslation()
  const language = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const myId = user?.id
  const seen = useRef(new Set<string>())

  useEffect(() => {
    return subscribeChatEvents((event: ChatSyncEvent) => {
      if (event.type === 'ticket-comment') {
        void qc.invalidateQueries({ queryKey: ['ticket', event.ticketId] })
        void qc.invalidateQueries({ queryKey: ['tickets'] })
        void qc.invalidateQueries({ queryKey: ['notifications'] })

        const dedupe = `${event.ticketId}:${event.commentId}`
        if (seen.current.has(dedupe)) return
        seen.current.add(dedupe)
        if (seen.current.size > 200) {
          const first = seen.current.values().next().value
          if (first) seen.current.delete(first)
        }

        if (event.authorId && event.authorId === myId) return

        const title = language === 'ar' ? event.titleAr || event.title : event.title
        const who = language === 'ar' ? event.authorNameAr || event.authorName : event.authorName
        void showDesktopNotification({
          title: language === 'ar' ? `رسالة جديدة — ${title}` : `New message — ${title}`,
          body: `${who}: ${event.body}`.slice(0, 180),
          url: `/tickets?id=${event.ticketId}`,
          tag: `ticket-${event.ticketId}`,
        })
      }

      if (event.type === 'ticket-created') {
        void qc.invalidateQueries({ queryKey: ['tickets'] })
        void qc.invalidateQueries({ queryKey: ['notifications'] })
        if (event.authorId === myId) return
        void showDesktopNotification({
          title: language === 'ar' ? 'محادثة جديدة' : 'New conversation',
          body: language === 'ar' ? event.titleAr || event.title : event.title,
          url: `/tickets?id=${event.ticketId}`,
          tag: `ticket-new-${event.ticketId}`,
        })
      }
    })
  }, [qc, myId, language])
}
