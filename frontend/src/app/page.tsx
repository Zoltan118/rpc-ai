'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const { session, loading } = useAuth()

  useEffect(() => {
    if (!loading && session) {
      router.push('/chat')
    }
  }, [session, loading, router])

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/chat`,
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
        <h1 className="text-4xl font-bold mb-8">Welcome to Chat App</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Sign in to start chatting with AI
        </p>
        <button
          onClick={handleSignIn}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  )
}
