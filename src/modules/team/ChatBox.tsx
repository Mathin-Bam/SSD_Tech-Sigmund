import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../hooks/useAuth'
import type { TeamMember } from '../../domain/types'

interface ChatBoxProps {
  isOpen: boolean
  onClose: () => void
  peer: TeamMember | null
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ChatBox({ isOpen, onClose, peer }: ChatBoxProps) {
  const { user } = useAuth()
  const { messages, loading, sendMessage } = useChat(peer?.userId ?? null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const myId = user?.id ?? ''

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen || !peer) return null

  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(input.trim())
      setInput('')
    } catch (err) {
      console.error('Send failed:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by date
  let lastDate = ''

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          height: '75vh',
          maxHeight: '650px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {getInitials(peer.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>{peer.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{peer.role}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', fontSize: '0.85rem' }}>
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: '3rem 1rem', fontSize: '0.85rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 36, display: 'block', marginBottom: '0.5rem', color: '#334155' }}>chat_bubble_outline</span>
              No messages yet. Say hello to {peer.name}!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === myId
              const dateLabel = formatDateLabel(msg.createdAt)
              let showDate = false
              if (dateLabel !== lastDate) {
                showDate = true
                lastDate = dateLabel
              }
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#475569', margin: '0.75rem 0 0.25rem', fontWeight: 600 }}>
                      {dateLabel}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: isMe
                          ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                          : 'rgba(255,255,255,0.06)',
                        color: isMe ? '#fff' : '#e2e8f0',
                        fontSize: '0.85rem',
                        lineHeight: 1.4,
                        border: isMe ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ wordBreak: 'break-word' }}>{msg.content}</div>
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: isMe ? 'rgba(255,255,255,0.6)' : '#64748b',
                          marginTop: '0.25rem',
                          textAlign: 'right',
                        }}
                      >
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending}
            style={{
              flex: 1,
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.3)',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{
              background: input.trim() ? 'var(--brand-primary, #3b82f6)' : 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '10px',
              padding: '0.6rem 0.85rem',
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              className="material-symbols-rounded"
              style={{ fontSize: 18, color: input.trim() ? '#fff' : '#475569' }}
            >
              send
            </span>
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
