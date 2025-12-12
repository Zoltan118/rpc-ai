import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { GoogleAuth } from '@/components/GoogleAuth'
import { MagicLinkAuth } from '@/components/MagicLinkAuth'
import { Mail, Chrome } from 'lucide-react'

export function LandingPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'google' | 'magic'>('google')

  React.useEffect(() => {
    if (session && !loading) {
      navigate('/chat')
    }
  }, [session, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">⚡</span>
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Welcome to RPC AI
              </h1>
              <p className="text-xl text-muted-foreground mt-3">
                Intelligent RPC endpoint management and optimization
              </p>
            </div>
          </div>

          {/* Auth Tabs */}
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab('google')}
                className={`flex-1 py-3 px-4 font-medium text-center border-b-2 transition ${
                  activeTab === 'google'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Chrome className="inline mr-2 h-4 w-4" />
                Google
              </button>
              <button
                onClick={() => setActiveTab('magic')}
                className={`flex-1 py-3 px-4 font-medium text-center border-b-2 transition ${
                  activeTab === 'magic'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mail className="inline mr-2 h-4 w-4" />
                Magic Link
              </button>
            </div>

            {/* Auth Forms */}
            <div className="min-h-[200px]">
              {activeTab === 'google' ? (
                <GoogleAuth />
              ) : (
                <MagicLinkAuth />
              )}
            </div>
          </div>

          {/* Features */}
          <div className="pt-6 border-t border-border space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              What you can do
            </p>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-lg bg-accent/10">
                <p className="font-semibold text-foreground">Monitor</p>
                <p className="text-muted-foreground text-xs">RPC Health</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/10">
                <p className="font-semibold text-foreground">Optimize</p>
                <p className="text-muted-foreground text-xs">Performance</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/10">
                <p className="font-semibold text-foreground">Analyze</p>
                <p className="text-muted-foreground text-xs">Metrics</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-muted-foreground text-center">
            Your data is secure and encrypted. We never store passwords.
          </p>
        </div>
      </div>
    </div>
  )
}
