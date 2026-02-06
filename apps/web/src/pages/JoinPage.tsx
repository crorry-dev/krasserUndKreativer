import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { EditIcon, EyeIcon } from '@/components/Icons'

interface LinkInfo {
  boardId: string
  boardName: string
  permissions: string
  requiresPassword: boolean
  expiresAt: string
  isValid: boolean
}

export function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [guestName, setGuestName] = useState('')
  const [joining, setJoining] = useState(false)
  
  useEffect(() => {
    fetchLinkInfo()
  }, [code])
  
  const fetchLinkInfo = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/guests/join/${code}`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Link ungültig')
      }
      
      const data = await response.json()
      setLinkInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }
  
  const handleJoin = async () => {
    if (!linkInfo) return
    if (linkInfo.requiresPassword && !password) {
      setError('Passwort erforderlich')
      return
    }
    if (!guestName.trim()) {
      setError('Bitte gib einen Namen ein')
      return
    }
    
    setJoining(true)
    setError(null)
    
    try {
      const response = await fetch(`http://localhost:8000/api/guests/join/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password || null,
          guest_name: guestName.trim(),
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Beitritt fehlgeschlagen')
      }
      
      const data = await response.json()
      
      // Save guest session
      localStorage.setItem('guest_token', data.guest_token)
      localStorage.setItem('guest_id', data.guest_id)
      localStorage.setItem('guest_name', guestName.trim())
      localStorage.setItem('guest_board_id', data.board_id)
      localStorage.setItem('guest_permissions', data.permissions)
      
      // Navigate to board
      navigate(`/board/${data.board_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beitritt fehlgeschlagen')
    } finally {
      setJoining(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full"
        />
      </div>
    )
  }
  
  if (error && !linkInfo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-gray-900 rounded-2xl border border-white/10 p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Link ungültig</h1>
          <p className="text-white/50 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            Zur Startseite
          </button>
        </motion.div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-gray-900 rounded-2xl border border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
          <h1 className="text-2xl font-bold text-white">Einladung zum Board</h1>
          <p className="text-white/80 mt-1">{linkInfo?.boardName || 'Kollaboratives Board'}</p>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
              {linkInfo?.permissions === 'edit' ? <EditIcon size={20} /> : <EyeIcon size={20} />}
            </div>
            <div>
              <p className="text-white font-medium">
                {linkInfo?.permissions === 'edit' ? 'Bearbeiten' : 'Nur Ansehen'}
              </p>
              <p className="text-white/50 text-sm">
                {linkInfo?.permissions === 'edit' 
                  ? 'Du kannst Inhalte hinzufügen und bearbeiten'
                  : 'Du kannst das Board nur ansehen'
                }
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-white/60 text-sm mb-1">Dein Name</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Wie möchtest du heißen?"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-white/30"
              autoFocus
            />
          </div>
          
          {linkInfo?.requiresPassword && (
            <div>
              <label className="block text-white/60 text-sm mb-1">
                Passwort 🔒
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort eingeben"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-white/30"
              />
            </div>
          )}
          
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center"
            >
              {error}
            </motion.p>
          )}
          
          <button
            onClick={handleJoin}
            disabled={joining || !guestName.trim()}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {joining ? 'Beitritt...' : '🚀 Board beitreten'}
          </button>
          
          <p className="text-white/30 text-xs text-center">
            Gültig bis {linkInfo?.expiresAt && new Date(linkInfo.expiresAt).toLocaleDateString('de-DE')}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
