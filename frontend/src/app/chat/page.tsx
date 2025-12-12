'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ChatHeader } from '@/components/ChatHeader'
import { MessageBubble } from '@/components/MessageBubble'
import { ChatComposer } from '@/components/ChatComposer'
import { ApiKeysModal } from '@/components/ApiKeysModal'
import { ConversationHistoryModal } from '@/components/ConversationHistoryModal'
import { Message } from '@/types/chat'

export default function ChatPage() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isPollingForKeys, setIsPollingForKeys] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!loading && !session) {
      router.push('/')
    }
  }, [session, loading, router])

  useEffect(() => {
    if (session && messages.length === 0) {
      loadInitialMessage()
    }
  }, [session])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadInitialMessage = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message: '' }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.conversationId) {
          setConversationId(data.conversationId)
        }
        if (data.message) {
          const assistantMessage: Message = {
            id: data.messageId || Date.now().toString(),
            role: 'assistant',
            content: data.message,
            timestamp: new Date().toISOString(),
            requiresPayment: data.requiresPayment || false,
          }
          setMessages([assistantMessage])
        }
      }
    } catch (error) {
      console.error('Failed to load initial message:', error)
    }
  }

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsSending(true)

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: content,
          conversationId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId)
        }

        const assistantMessage: Message = {
          id: data.messageId || (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || data.response || 'No response',
          timestamp: new Date().toISOString(),
          requiresPayment: data.requiresPayment || false,
        }

        setMessages((prev) => [...prev, assistantMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  const handlePayment = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/payments/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.open(data.url, '_blank')
          startPollingForApiKeys()
        }
      }
    } catch (error) {
      console.error('Failed to create payment link:', error)
    }
  }

  const startPollingForApiKeys = () => {
    if (isPollingForKeys) return

    setIsPollingForKeys(true)
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
        const response = await fetch(`${apiBaseUrl}/api/api-keys`, {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.keys && data.keys.length > 0) {
            const lastKey = data.keys[data.keys.length - 1]
            const keyReceivedAt = new Date(lastKey.createdAt).getTime()
            const now = Date.now()
            
            if (now - keyReceivedAt < 60000) {
              const apiKeyMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Payment successful! Here are your API keys:',
                timestamp: new Date().toISOString(),
                apiKeys: data.keys,
              }
              setMessages((prev) => [...prev, apiKeyMessage])
              
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
              }
              setIsPollingForKeys(false)
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll for API keys:', error)
      }
    }, 3000)

    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        setIsPollingForKeys(false)
      }
    }, 300000)
  }

  const loadConversation = async (id: string) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/conversations/${id}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.conversation) {
          setConversationId(data.conversation.id)
          setMessages(data.conversation.messages || [])
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex flex-col h-screen">
      <ChatHeader
        onShowApiKeys={() => setShowApiKeys(true)}
        onShowHistory={() => setShowHistory(true)}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onPaymentClick={message.requiresPayment ? handlePayment : undefined}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatComposer onSend={sendMessage} disabled={isSending} />

      <ApiKeysModal
        isOpen={showApiKeys}
        onClose={() => setShowApiKeys(false)}
      />

      <ConversationHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectConversation={loadConversation}
      />
    </div>
  )
}
