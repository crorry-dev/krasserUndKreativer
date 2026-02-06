import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { useAuthStore } from '@/stores/authStore'
import { CloseIcon, LinkIcon, CheckIcon, LockIcon } from '@/components/Icons'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
}

interface GuestLink {
  id: string
  expiresAt: Date
  maxUses: number | null
  usageCount: number
  permissions: string
  hasPassword: boolean
  isActive: boolean
}

export function ShareModal({ isOpen, onClose, boardId }: ShareModalProps) {
  const [links, setLinks] = useState<GuestLink[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newLinkSettings, setNewLinkSettings] = useState({
    expiresInDays: 14,
    maxUses: null as number | null,
    password: '',
    permissions: 'edit' as 'edit' | 'view',
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { token } = useAuthStore()
  
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  
  // Fetch existing links when modal opens
  const fetchLinks = useCallback(async () => {
    if (!boardId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${API_BASE}/api/guests/${boardId}/links`, { headers })
      
      if (response.ok) {
        const data = await response.json()
        setLinks(data.map((link: { id: string; expires_at: string; max_uses: number | null; usage_count: number; permissions: string; has_password: boolean; is_active: boolean }) => ({
          id: link.id,
          expiresAt: new Date(link.expires_at),
          maxUses: link.max_uses,
          usageCount: link.usage_count,
          permissions: link.permissions,
          hasPassword: link.has_password,
          isActive: link.is_active,
        })))
      } else if (response.status === 404) {
        // Board doesn't exist yet or no links
        setLinks([])
      } else {
        setError('Links konnten nicht geladen werden')
      }
    } catch (err) {
      console.error('Failed to fetch links:', err)
      setError('Verbindungsfehler')
    } finally {
      setIsLoading(false)
    }
  }, [boardId, token, API_BASE])
  
  useEffect(() => {
    if (isOpen && boardId) {
      fetchLinks()
    }
  }, [isOpen, boardId, fetchLinks])
  
  const createLink = async () => {
    if (!boardId) {
      setError('Kein Board ausgewählt')
      return
    }
    
    setIsCreating(true)
    setError(null)
    
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${API_BASE}/api/guests/${boardId}/links`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          expires_in_days: newLinkSettings.expiresInDays,
          max_uses: newLinkSettings.maxUses,
          password: newLinkSettings.password || null,
          permissions: newLinkSettings.permissions,
        }),
      })
      
      if (response.ok) {
        const newLink = await response.json()
        setLinks([{
          id: newLink.id,
          expiresAt: new Date(newLink.expires_at),
          maxUses: newLink.max_uses,
          usageCount: newLink.usage_count,
          permissions: newLink.permissions,
          hasPassword: newLink.has_password,
          isActive: newLink.is_active,
        }, ...links])
        
        // Reset form
        setNewLinkSettings({
          expiresInDays: 14,
          maxUses: null,
          password: '',
          permissions: 'edit',
        })
        
        // Auto-copy the new link
        copyLink(newLink.id)
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.detail || 'Link konnte nicht erstellt werden')
      }
    } catch (err) {
      console.error('Failed to create link:', err)
      setError('Verbindungsfehler')
    } finally {
      setIsCreating(false)
    }
  }
  
  const copyLink = async (linkId: string) => {
    const url = `${window.location.origin}/join/${linkId}`
    await navigator.clipboard.writeText(url)
    setCopiedId(linkId)
    setTimeout(() => setCopiedId(null), 2000)
  }
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Board teilen</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-colors"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <p className="text-white/50 text-sm mt-1">
                Erstelle einen Link um andere einzuladen
              </p>
            </div>
            
            {/* Create Link Form */}
            <div className="p-6 space-y-4 border-b border-white/10">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-sm mb-1">Gültig für</label>
                  <select
                    value={newLinkSettings.expiresInDays}
                    onChange={(e) => setNewLinkSettings(s => ({ ...s, expiresInDays: Number(e.target.value) }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1 Tag</option>
                    <option value={7}>1 Woche</option>
                    <option value={14}>2 Wochen</option>
                    <option value={30}>1 Monat</option>
                    <option value={90}>3 Monate</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Berechtigung</label>
                  <select
                    value={newLinkSettings.permissions}
                    onChange={(e) => setNewLinkSettings(s => ({ ...s, permissions: e.target.value as 'edit' | 'view' }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="edit">Bearbeiten</option>
                    <option value="view">Nur ansehen</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-white/60 text-sm mb-1">Passwort (optional)</label>
                <input
                  type="password"
                  value={newLinkSettings.password}
                  onChange={(e) => setNewLinkSettings(s => ({ ...s, password: e.target.value }))}
                  placeholder="Leer = kein Passwort"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-white/30"
                />
              </div>
              
              <button
                onClick={createLink}
                disabled={isCreating}
                className={clsx(
                  "w-full py-3 rounded-lg font-medium transition-all",
                  isCreating
                    ? "bg-indigo-500/50 text-white/50 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
                )}
              >
                {isCreating ? 'Erstelle...' : <span className="flex items-center justify-center gap-2"><LinkIcon size={18} /> Link erstellen</span>}
              </button>
            </div>
            
            {/* Existing Links */}
            <div className="p-6 max-h-64 overflow-y-auto">
              <h3 className="text-white/60 text-sm font-medium mb-3">Aktive Links</h3>
              
              {/* Error message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">
                  {error}
                </div>
              )}
              
              {isLoading ? (
                <p className="text-white/40 text-sm text-center py-4">
                  Lade Links...
                </p>
              ) : links.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-4">
                  Noch keine Links erstellt
                </p>
              ) : (
                <div className="space-y-2">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className={clsx(
                        "flex items-center justify-between p-3 rounded-lg",
                        link.isActive ? "bg-white/5" : "bg-white/5 opacity-50"
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono text-sm">{link.id}</span>
                          {link.hasPassword && <span className="text-white/40"><LockIcon size={12} /></span>}
                          <span className={clsx(
                            "text-xs px-2 py-0.5 rounded",
                            link.permissions === 'edit' 
                              ? "bg-green-500/20 text-green-400"
                              : "bg-blue-500/20 text-blue-400"
                          )}>
                            {link.permissions === 'edit' ? 'Bearbeiten' : 'Ansehen'}
                          </span>
                        </div>
                        <div className="text-white/40 text-xs mt-1">
                          Gültig bis {formatDate(link.expiresAt)}
                          {link.maxUses && ` • ${link.usageCount}/${link.maxUses} verwendet`}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => copyLink(link.id)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors flex items-center gap-1"
                      >
                        {copiedId === link.id ? <><CheckIcon size={14} /> Kopiert</> : 'Kopieren'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
