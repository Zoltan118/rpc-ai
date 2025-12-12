export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  requiresPayment?: boolean
  apiKeys?: ApiKey[]
}

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: Message[]
}

export interface ApiKey {
  id: string
  key: string
  name?: string
  createdAt: string
  expiresAt?: string
}
