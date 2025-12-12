import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'

interface MagicLinkAuthProps {
  onSuccess?: () => void
}

export function MagicLinkAuth({ onSuccess }: MagicLinkAuthProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setSubmitted(true)
        onSuccess?.()
      }
    } catch (err) {
      setError('Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 text-center">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Check your email for a magic link!
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">
            We've sent a login link to <strong>{email}</strong>
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSubmitted(false)
            setEmail('')
          }}
        >
          Send to different email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-background"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button
        type="submit"
        disabled={loading || !email}
        className="w-full"
        size="lg"
      >
        <Mail className="mr-2 h-4 w-4" />
        {loading ? 'Sending...' : 'Send Magic Link'}
      </Button>
    </form>
  )
}
