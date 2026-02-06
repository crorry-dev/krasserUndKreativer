import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, MapPin, Users, Trash2, Plus } from 'lucide-react'
import { useCanvasStore, WorkspaceRegion, WorkspacePermission } from '../../stores/canvasStore'

const REGION_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

interface WorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  editRegion?: WorkspaceRegion | null
  initialBounds?: { x1: number; y1: number; x2: number; y2: number }
}

export function WorkspaceModal({ isOpen, onClose, editRegion, initialBounds }: WorkspaceModalProps) {
  const addWorkspaceRegion = useCanvasStore((s) => s.addWorkspaceRegion)
  const updateWorkspaceRegion = useCanvasStore((s) => s.updateWorkspaceRegion)
  const viewport = useCanvasStore((s) => s.viewport)
  const currentUserId = useCanvasStore((s) => s.currentUserId)
  
  const [name, setName] = useState('')
  const [color, setColor] = useState(REGION_COLORS[0])
  const [x1, setX1] = useState(0)
  const [y1, setY1] = useState(0)
  const [x2, setX2] = useState(500)
  const [y2, setY2] = useState(400)
  const [isLocked, setIsLocked] = useState(false)
  const [obscureNoAccess, setObscureNoAccess] = useState(false)
  const [permissions, setPermissions] = useState<WorkspacePermission[]>([
    { userId: '*', role: 'viewer' }
  ])
  
  // Initialize form when editing or opening new
  useEffect(() => {
    if (editRegion) {
      setName(editRegion.name)
      setColor(editRegion.color)
      setX1(editRegion.bounds.x1)
      setY1(editRegion.bounds.y1)
      setX2(editRegion.bounds.x2)
      setY2(editRegion.bounds.y2)
      setIsLocked(editRegion.isLocked)
      setObscureNoAccess(editRegion.obscureNoAccess)
      setPermissions(editRegion.permissions)
    } else if (initialBounds) {
      setX1(initialBounds.x1)
      setY1(initialBounds.y1)
      setX2(initialBounds.x2)
      setY2(initialBounds.y2)
      setName('')
      setColor(REGION_COLORS[Math.floor(Math.random() * REGION_COLORS.length)])
      setPermissions([
        { userId: currentUserId, role: 'editor' },
        { userId: '*', role: 'viewer' },
      ])
      setIsLocked(false)
      setObscureNoAccess(false)
    } else {
      // Default to visible area
      const centerX = -viewport.x + window.innerWidth / 2 / viewport.scale
      const centerY = -viewport.y + window.innerHeight / 2 / viewport.scale
      setX1(Math.round(centerX - 250))
      setY1(Math.round(centerY - 200))
      setX2(Math.round(centerX + 250))
      setY2(Math.round(centerY + 200))
      setName('')
      setColor(REGION_COLORS[Math.floor(Math.random() * REGION_COLORS.length)])
      setPermissions([
        { userId: currentUserId, role: 'editor' },
        { userId: '*', role: 'viewer' },
      ])
      setIsLocked(false)
      setObscureNoAccess(false)
    }
  }, [editRegion, initialBounds, viewport, isOpen, currentUserId])
  
  const handleSubmit = () => {
    if (!name.trim()) return
    
    const bounds = {
      x1: Math.min(x1, x2),
      y1: Math.min(y1, y2),
      x2: Math.max(x1, x2),
      y2: Math.max(y1, y2),
    }
    
    if (editRegion) {
      const updatedRegion: WorkspaceRegion = {
        ...editRegion,
        name: name.trim(),
        color,
        bounds,
        isLocked,
        obscureNoAccess,
        permissions,
      }
      updateWorkspaceRegion(editRegion.id, {
        name: name.trim(),
        color,
        bounds,
        isLocked,
        obscureNoAccess,
        permissions,
      })
      window.dispatchEvent(new CustomEvent('workspace_region:update', { detail: updatedRegion }))
    } else {
      const created = addWorkspaceRegion({
        name: name.trim(),
        color,
        bounds,
        isLocked,
        obscureNoAccess,
        permissions,
      })
      window.dispatchEvent(new CustomEvent('workspace_region:create', { detail: created }))
    }
    
    onClose()
  }
  
  const updatePermission = (index: number, role: 'editor' | 'viewer' | 'none') => {
    const newPermissions = [...permissions]
    newPermissions[index] = { ...newPermissions[index], role }
    setPermissions(newPermissions)
  }
  
  const addPermission = () => {
    setPermissions([...permissions, { userId: '', role: 'viewer' }])
  }
  
  const removePermission = (index: number) => {
    if (permissions.length > 1) {
      setPermissions(permissions.filter((_, i) => i !== index))
    }
  }
  
  const updatePermissionUserId = (index: number, userId: string) => {
    const newPermissions = [...permissions]
    newPermissions[index] = { ...newPermissions[index], userId }
    setPermissions(newPermissions)
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {editRegion ? 'Arbeitsbereich bearbeiten' : 'Neuer Arbeitsbereich'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Design Team Bereich"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
              </div>
              
              {/* Coordinates */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Koordinaten
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Von X</label>
                    <input
                      type="number"
                      value={x1}
                      onChange={(e) => setX1(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Von Y</label>
                    <input
                      type="number"
                      value={y1}
                      onChange={(e) => setY1(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Bis X</label>
                    <input
                      type="number"
                      value={x2}
                      onChange={(e) => setX2(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Bis Y</label>
                    <input
                      type="number"
                      value={y2}
                      onChange={(e) => setY2(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-white/40">
                  Größe: {Math.abs(x2 - x1)} × {Math.abs(y2 - y1)} px
                </p>
              </div>
              
              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Farbe
                </label>
                <div className="flex gap-2">
                  {REGION_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Berechtigungen
                  </label>
                  <button
                    onClick={addPermission}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Hinzufügen
                  </button>
                </div>
                <div className="space-y-2">
                  {permissions.map((perm, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-white/5 rounded-lg"
                    >
                      <input
                        type="text"
                        value={perm.userId === '*' ? 'Alle anderen' : perm.userId}
                        onChange={(e) => updatePermissionUserId(index, e.target.value === 'Alle anderen' ? '*' : e.target.value)}
                        placeholder="User ID oder *"
                        className="flex-1 px-2 py-1 bg-transparent border-none text-white text-sm focus:outline-none"
                        readOnly={perm.userId === '*'}
                      />
                      <select
                        value={perm.role}
                        onChange={(e) => updatePermission(index, e.target.value as 'editor' | 'viewer' | 'none')}
                        className="px-2 py-1 bg-white/10 border border-white/10 rounded text-white text-sm focus:outline-none"
                      >
                        <option value="editor">Bearbeiter</option>
                        <option value="viewer">Betrachter</option>
                        <option value="none">Kein Zugriff</option>
                      </select>
                      {permissions.length > 1 && (
                        <button
                          onClick={() => removePermission(index)}
                          className="p-1 text-red-400/60 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Lock option */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLocked}
                  onChange={(e) => setIsLocked(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/20"
                />
                <span className="text-sm text-white/70">
                  Bereich fixieren (kann nicht verschoben werden)
                </span>
              </label>

              {/* Obscure option */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={obscureNoAccess}
                  onChange={(e) => setObscureNoAccess(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/20"
                />
                <span className="text-sm text-white/70">
                  Bereich für Nutzer ohne Zugriff verpixeln
                </span>
              </label>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                {editRegion ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
