import { useEffect, useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { ApiKey } from '@/types/chat'

interface ApiKeysModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchApiKeys()
    }
  }, [isOpen])

  const fetchApiKeys = async () => {
    setLoading(true)
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/api-keys`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.keys || [])
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (key: ApiKey) => {
    try {
      await navigator.clipboard.writeText(key.key)
      setCopiedId(key.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">API Keys</h2>
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
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No API keys found</p>
              <p className="text-sm mt-2">
                Complete a payment to receive your first API key
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {key.name && (
                        <p className="font-medium mb-2">{key.name}</p>
                      )}
                      <code className="text-sm bg-muted px-2 py-1 rounded block break-all">
                        {key.key}
                      </code>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                        {key.expiresAt && (
                          <span>Expires: {new Date(key.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(key)}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedId === key.id ? (
                        <Check size={18} className="text-green-600" />
                      ) : (
                        <Copy size={18} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
