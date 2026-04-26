import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  isRead: boolean
  createdAt: string
}

function mapMsg(row: any): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

export function useChat(peerId: string | null) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const myId = user?.id ?? ''

  const fetchMessages = useCallback(async () => {
    if (!myId || !peerId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${myId})`
        )
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages((data ?? []).map(mapMsg))
    } catch (err: any) {
      console.error('[useChat] fetch failed:', err.message)
    } finally {
      setLoading(false)
    }
  }, [myId, peerId])

  // Mark unread messages from peer as read
  const markAsRead = useCallback(async () => {
    if (!myId || !peerId) return
    await (supabase.from('messages') as any)
      .update({ is_read: true })
      .eq('sender_id', peerId)
      .eq('receiver_id', myId)
      .eq('is_read', false)
  }, [myId, peerId])

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!myId || !peerId || !content.trim()) return
    const { error } = await (supabase.from('messages') as any).insert({
      sender_id: myId,
      receiver_id: peerId,
      content: content.trim(),
    })
    if (error) {
      console.error('[useChat] send failed:', error.message)
      throw error
    }
  }, [myId, peerId])

  // Realtime subscription
  useEffect(() => {
    if (!myId || !peerId) return

    void fetchMessages()
    void markAsRead()

    const channel = supabase
      .channel(`chat_${myId}_${peerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const msg = mapMsg(payload.new)
          // Only add if relevant to this conversation
          if (
            (msg.senderId === myId && msg.receiverId === peerId) ||
            (msg.senderId === peerId && msg.receiverId === myId)
          ) {
            setMessages(prev => [...prev, msg])
            // If the message is from the peer, mark as read immediately
            if (msg.senderId === peerId) {
              void markAsRead()
            }
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [myId, peerId, fetchMessages, markAsRead])

  // Unread count for a given sender
  const getUnreadCount = useCallback(async (fromUserId: string): Promise<number> => {
    if (!myId) return 0
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', fromUserId)
      .eq('receiver_id', myId)
      .eq('is_read', false)
    
    if (error) return 0
    return count ?? 0
  }, [myId])

  return { messages, loading, sendMessage, markAsRead, getUnreadCount, refetch: fetchMessages }
}
