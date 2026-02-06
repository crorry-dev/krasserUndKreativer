import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Plus, Trash2, Lock, Unlock, Edit2, ChevronRight } from 'lucide-react'
import { useCanvasStore, WorkspaceRegion } from '../../stores/canvasStore'
interface WorkspacePanelProps {
  isOpen: boolean
  onClose: () => void
  onCreateNew: () => void
  onEditRegion: (region: WorkspaceRegion) => void
}

export function WorkspacePanel({ isOpen, onClose, onCreateNew, onEditRegion }: WorkspacePanelProps) {
  const workspaceRegions = useCanvasStore((s) => s.workspaceRegions)
  const removeWorkspaceRegion = useCanvasStore((s) => s.removeWorkspaceRegion)
  const updateWorkspaceRegion = useCanvasStore((s) => s.updateWorkspaceRegion)
  const setViewport = useCanvasStore((s) => s.setViewport)
  const currentUserId = useCanvasStore((s) => s.currentUserId)
  const setWorkspaceDrawMode = useCanvasStore((s) => s.setWorkspaceDrawMode)
  
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)
  
  const navigateToRegion = (region: WorkspaceRegion) => {
    const centerX = (region.bounds.x1 + region.bounds.x2) / 2
    const centerY = (region.bounds.y1 + region.bounds.y2) / 2
    setViewport({ x: -centerX + window.innerWidth / 2, y: -centerY + window.innerHeight / 2 })
  }
  
  const toggleLock = (region: WorkspaceRegion) => {
    const updated: WorkspaceRegion = { ...region, isLocked: !region.isLocked }
    updateWorkspaceRegion(region.id, { isLocked: updated.isLocked })
    window.dispatchEvent(new CustomEvent('workspace_region:update', { detail: updated }))
  }
  
  const getPermissionLabel = (region: WorkspaceRegion) => {
    const perm = region.permissions.find((p) => p.userId === currentUserId || p.userId === '*')
    if (!perm) return 'Kein Zugriff'
    switch (perm.role) {
      case 'editor': return 'Bearbeiter'
      case 'viewer': return 'Betrachter'
      case 'none': return 'Kein Zugriff'
    }
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed left-4 top-20 z-40 w-72 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-white">Arbeitsbereiche</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
          
          {/* Region List */}
          <div className="max-h-[400px] overflow-y-auto">
            {workspaceRegions.length === 0 ? (
              <div className="p-6 text-center text-white/40">
                <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Noch keine Arbeitsbereiche</p>
                <p className="text-xs mt-1">Erstelle Bereiche, um Teams zu organisieren</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {workspaceRegions.map((region) => (
                  <div key={region.id}>
                    {/* Region Item */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                      onClick={() => setExpandedRegion(expandedRegion === region.id ? null : region.id)}
                    >
                      {/* Color indicator */}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: region.color }}
                      />
                      
                      {/* Name and info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate">
                            {region.name}
                          </span>
                          {region.isLocked && (
                            <Lock className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-white/40 text-xs">
                          {getPermissionLabel(region)}
                        </span>
                      </div>
                      
                      {/* Expand indicator */}
                      <ChevronRight
                        className={`w-4 h-4 text-white/40 transition-transform ${
                          expandedRegion === region.id ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                    
                    {/* Expanded actions */}
                    <AnimatePresence>
                      {expandedRegion === region.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-1 px-3 py-2 ml-5 border-l border-white/10">
                            {/* Navigate */}
                            <button
                              onClick={() => navigateToRegion(region)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              Gehe zu
                            </button>
                            
                            {/* Edit */}
                            <button
                              onClick={() => onEditRegion(region)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Bearbeiten
                            </button>
                            
                            {/* Lock toggle */}
                            <button
                              onClick={() => toggleLock(region)}
                              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                              title={region.isLocked ? 'Entsperren' : 'Sperren'}
                            >
                              {region.isLocked ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                            
                            {/* Delete */}
                            <button
                              onClick={() => {
                                removeWorkspaceRegion(region.id)
                                window.dispatchEvent(new CustomEvent('workspace_region:delete', { detail: { id: region.id } }))
                              }}
                              className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
            <button
              onClick={() => {
                setWorkspaceDrawMode(true)
                onClose()
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Auf Board zeichnen</span>
            </button>
              </div>
            )}
          </div>
          
          {/* Create button */}
          <div className="p-3 border-t border-white/10">
            <button
              onClick={onCreateNew}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Neuer Arbeitsbereich</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
