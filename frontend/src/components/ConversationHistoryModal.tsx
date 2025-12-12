import { useEffect, useState } from 'react'
import { X, MessageSquare } from 'lucide-react'
import { Conversation } from '@/types/chat'

interface ConversationHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectConversation: (conversationId: string) => void
}

export function ConversationHistoryModal({
  isOpen,
  onClose,
  onSelectConversation,
}: ConversationHistoryModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchConversations()
    }
  }, [isOpen])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/conversations`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">Conversation History</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="mx-auto mb-4" size={48} />
              <p>No conversations yet</p>
              <p className="text-sm mt-2">
                Start chatting to see your conversation history
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className="w-full text-left p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conversation.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {conversation.messages.length} message
                        {conversation.messages.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-xs text-muted-foreground">
                      {new Date(conversation.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
