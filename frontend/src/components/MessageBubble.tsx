import { Message } from '@/types/chat'
import { User, Bot } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  onPaymentClick?: () => void
}

export function MessageBubble({ message, onPaymentClick }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        }`}
      >
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      <div
        className={`flex-1 max-w-3xl ${isUser ? 'text-right' : 'text-left'}`}
      >
        <div
          className={`inline-block px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          {message.requiresPayment && (
            <button
              onClick={onPaymentClick}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full"
            >
              Continue with Payment
            </button>
          )}
          {message.apiKeys && message.apiKeys.length > 0 && (
            <div className="mt-3 p-3 bg-background rounded border border-border">
              <p className="font-semibold mb-2">Your API Keys:</p>
              {message.apiKeys.map((key) => (
                <div key={key.id} className="mb-2 last:mb-0">
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {key.key}
                  </code>
                  {key.name && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({key.name})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
