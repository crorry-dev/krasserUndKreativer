import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { useCanvasStore } from '@/stores/canvasStore'
import {
  HistoryIcon,
  CloseIcon,
  UndoIcon,
  RedoIcon,
  RefreshIcon,
  FileIcon,
  UsersIcon,
} from '@/components/Icons'

interface TimelineBucket {
  timestamp: string
  sequenceStart: number
  sequenceEnd: number
  eventCount: number
  creates: number
  updates: number
  deletes: number
  contributorCount: number
}

interface HistoryPanelProps {
  boardId: string
  isOpen: boolean
  onClose: () => void
  onRollback?: (sequence: number) => void
}

// Format timestamp to readable time
const formatActionTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'gerade eben'
  if (diffMins < 60) return `vor ${diffMins} Min`
  if (diffHours < 24) return `vor ${diffHours} Std`
  
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export function HistoryPanel({ boardId, isOpen, onClose, onRollback }: HistoryPanelProps) {
  const [timeline, setTimeline] = useState<TimelineBucket[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBucket, setSelectedBucket] = useState<TimelineBucket | null>(null)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const [activeTab, setActiveTab] = useState<'local' | 'server'>('local')
  
  // Local history from store
  const history = useCanvasStore((s) => s.history)
  const historyIndex = useCanvasStore((s) => s.historyIndex)
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const canUndo = useCanvasStore((s) => s.canUndo)
  const canRedo = useCanvasStore((s) => s.canRedo)
  const clearHistory = useCanvasStore((s) => s.clearHistory)
  const userNames = useCanvasStore((s) => s.userNames)
  
  // Get user display name by ID
  const getUserName = (userId: string) => {
    return userNames.get(userId) || userId.substring(0, 8) + '...'
  }
  
  useEffect(() => {
    if (isOpen) {
      fetchTimeline()
    }
  }, [isOpen, boardId])
  
  const fetchTimeline = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `http://localhost:8000/api/boards/${boardId}/history/timeline?granularity=minute`
      )
      if (response.ok) {
        const data = await response.json()
        setTimeline(data.map((item: any) => ({
          timestamp: item.timestamp,
          sequenceStart: item.sequence_start,
          sequenceEnd: item.sequence_end,
          eventCount: item.event_count,
          creates: item.creates,
          updates: item.updates,
          deletes: item.deletes,
          contributorCount: item.contributor_count,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRollback = async (sequence: number) => {
    if (!confirm(`Zurücksetzen auf Punkt ${sequence}? Alle nachfolgenden Änderungen werden rückgängig gemacht.`)) {
      return
    }
    
    setIsRollingBack(true)
    try {
      const response = await fetch(
        `http://localhost:8000/api/boards/${boardId}/history/rollback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_sequence: sequence }),
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        alert(`✅ ${data.message}`)
        onRollback?.(sequence)
        fetchTimeline()
      } else {
        const error = await response.json()
        alert(`❌ Fehler: ${error.detail}`)
      }
    } catch (error) {
      console.error('Rollback failed:', error)
      alert('❌ Rollback fehlgeschlagen')
    } finally {
      setIsRollingBack(false)
    }
  }
  
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp.replace(' ', 'T'))
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return timestamp
    }
  }
  
  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp.replace(' ', 'T'))
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    } catch {
      return ''
    }
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 bg-gray-900 border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <HistoryIcon size={20} />
                  Verlauf
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setActiveTab('local')}
                  className={clsx(
                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                    activeTab === 'local'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  )}
                >
                  Lokal ({history.length})
                </button>
                <button
                  onClick={() => setActiveTab('server')}
                  className={clsx(
                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                    activeTab === 'server'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  )}
                >
                  Server
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'local' ? (
                /* Local History */
                <div className="p-4">
                  {/* Undo/Redo Controls */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={undo}
                      disabled={!canUndo()}
                      className={clsx(
                        'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2',
                        canUndo()
                          ? 'bg-white/10 text-white hover:bg-white/20'
                          : 'bg-white/5 text-white/30 cursor-not-allowed'
                      )}
                    >
                      <UndoIcon size={16} /> Rückgängig
                    </button>
                    <button
                      onClick={redo}
                      disabled={!canRedo()}
                      className={clsx(
                        'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2',
                        canRedo()
                          ? 'bg-white/10 text-white hover:bg-white/20'
                          : 'bg-white/5 text-white/30 cursor-not-allowed'
                      )}
                    >
                      Wiederholen <RedoIcon size={16} />
                    </button>
                  </div>
                  
                  {/* Keyboard shortcuts hint */}
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-white/50 text-xs">
                      <span className="text-white/70">Tastenkürzel:</span><br />
                      ⌘/Ctrl + Z = Rückgängig<br />
                      ⌘/Ctrl + Shift + Z = Wiederholen
                    </p>
                  </div>
                  
                  {/* Local history list */}
                  {history.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mb-3 flex justify-center text-white/30">
                        <FileIcon size={40} />
                      </div>
                      <p className="text-white/50 text-sm">Noch keine lokalen Änderungen</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.slice().reverse().map((action, idx) => {
                        const realIndex = history.length - 1 - idx
                        const isCurrent = realIndex === historyIndex
                        const isPast = realIndex <= historyIndex
                        
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className={clsx(
                              'p-3 rounded-lg transition-colors',
                              isCurrent ? 'bg-indigo-500/20 border border-indigo-500/50' : 
                              isPast ? 'bg-white/5' : 'bg-white/5 opacity-50'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0',
                                action.type === 'add' ? 'bg-green-500/20 text-green-400' :
                                action.type === 'delete' ? 'bg-red-500/20 text-red-400' :
                                action.type === 'update' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-purple-500/20 text-purple-400'
                              )}>
                                {action.type === 'add' ? '+' :
                                 action.type === 'delete' ? '−' :
                                 action.type === 'update' ? '~' : '∿'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="text-white text-sm block">
                                  {action.type === 'add' && 'Objekt hinzugefügt'}
                                  {action.type === 'delete' && 'Objekt gelöscht'}
                                  {action.type === 'update' && 'Objekt bearbeitet'}
                                  {action.type === 'multi' && (
                                    <>
                                      {action.deletedObjects?.length || 0} gelöscht, {action.createdObjects?.length || 0} erstellt
                                    </>
                                  )}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {action.userId && (
                                    <span className="text-white/40 text-xs truncate flex items-center gap-1">
                                      <UsersIcon size={10} />
                                      {getUserName(action.userId)}
                                    </span>
                                  )}
                                  {action.timestamp && (
                                    <span className="text-white/30 text-xs">
                                      {formatActionTime(action.timestamp)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isCurrent && (
                                <span className="text-xs text-indigo-400 flex-shrink-0">Aktuell</span>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                  
                  {/* Clear history button */}
                  {history.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Verlauf wirklich löschen? Dies kann nicht rückgängig gemacht werden.')) {
                          clearHistory()
                        }
                      }}
                      className="w-full mt-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                    >
                      Verlauf löschen
                    </button>
                  )}
                </div>
              ) : (
                /* Server History */
                <div className="p-4">
                  <p className="text-white/50 text-sm mb-4">
                    Klicke auf einen Punkt um Details zu sehen
                  </p>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full"
                      />
                    </div>
                  ) : timeline.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mb-3 flex justify-center text-white/30">
                        <FileIcon size={40} />
                      </div>
                      <p className="text-white/50 text-sm">Noch keine Server-Änderungen</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />
                      
                      {/* Timeline items */}
                      <div className="space-y-4">
                        {timeline.slice().reverse().map((bucket, index) => (
                          <motion.div
                            key={bucket.timestamp}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setSelectedBucket(bucket === selectedBucket ? null : bucket)}
                            className={clsx(
                              "relative pl-10 cursor-pointer transition-colors",
                              selectedBucket === bucket ? "bg-white/5 -mx-4 px-4 py-2 rounded-lg ml-6" : ""
                            )}
                          >
                            {/* Timeline dot */}
                            <div className={clsx(
                              "absolute left-2.5 w-3 h-3 rounded-full border-2 transition-colors",
                              selectedBucket === bucket
                                ? "bg-indigo-500 border-indigo-500"
                                : "bg-gray-900 border-white/30"
                            )} />
                            
                            {/* Content */}
                            <div className="flex items-center gap-2">
                              <span className="text-white font-mono text-sm">
                                {formatTime(bucket.timestamp)}
                              </span>
                              <span className="text-white/40 text-xs">
                                {formatDate(bucket.timestamp)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1">
                              {bucket.creates > 0 && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                  +{bucket.creates}
                                </span>
                              )}
                              {bucket.updates > 0 && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                  ~{bucket.updates}
                                </span>
                              )}
                              {bucket.deletes > 0 && (
                                <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                                  -{bucket.deletes}
                                </span>
                              )}
                              <span className="text-white/40 text-xs">
                                {bucket.contributorCount} {bucket.contributorCount === 1 ? 'Person' : 'Personen'}
                              </span>
                            </div>
                            
                            {/* Expanded details */}
                            <AnimatePresence>
                              {selectedBucket === bucket && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 pt-3 border-t border-white/10"
                                >
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-white/50">Änderungen</span>
                                      <span className="text-white">{bucket.eventCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-white/50">Sequenz</span>
                                      <span className="text-white font-mono">
                                        #{bucket.sequenceStart}
                                        {bucket.sequenceEnd !== bucket.sequenceStart && (
                                          <>-#{bucket.sequenceEnd}</>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRollback(bucket.sequenceStart - 1)
                                    }}
                                    disabled={isRollingBack}
                                    className="w-full mt-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                  >
                                    {isRollingBack ? 'Wird zurückgesetzt...' : <><UndoIcon size={14} /> Hierher zurücksetzen</>}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              {activeTab === 'server' && (
                <button
                  onClick={fetchTimeline}
                  disabled={loading}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshIcon size={16} /> Aktualisieren
                </button>
              )}
              {activeTab === 'local' && (
                <p className="text-white/40 text-xs text-center">
                  {history.length} Aktionen im Verlauf • Position {historyIndex + 1}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
