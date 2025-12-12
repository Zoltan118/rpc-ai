import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { MessageSquare, Sun, Moon, User, LogOut, Key, History } from 'lucide-react'

interface ChatHeaderProps {
  onShowApiKeys: () => void
  onShowHistory: () => void
}

export function ChatHeader({ onShowApiKeys, onShowHistory }: ChatHeaderProps) {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <MessageSquare className="h-6 w-6" />
          <span className="hidden md:inline-block">Chat App</span>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="rounded-full w-9 h-9 bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <User size={18} />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-background shadow-lg">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-medium truncate">
                    {user?.email || 'User'}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      onShowApiKeys()
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <Key size={16} />
                    API Keys
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      onShowHistory()
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <History size={16} />
                    Conversation History
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-red-600 dark:text-red-400"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
