import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { useCanvasStore } from '@/stores/canvasStore'
import {
  CloseIcon,
  FileIcon,
  FilePlusIcon,
  SaveIcon,
  FolderOpenIcon,
  LinkIcon,
  UsersIcon,
  SettingsIcon,
  ImageIcon,
  EditIcon,
} from '@/components/Icons'

interface RemoteUser {
  userId: string
  displayName: string
  color: string
  cursorX: number
  cursorY: number
}

interface Settings {
  showGrid: boolean
  gridSize: number
  snapToGrid: boolean
  darkMode: boolean
  cursorTrails: boolean
  showOtherCursors: boolean
  autoSave: boolean
}

const defaultSettings: Settings = {
  showGrid: false,
  gridSize: 20,
  snapToGrid: false,
  darkMode: true,
  cursorTrails: false,
  showOtherCursors: true,
  autoSave: false,
}

interface ProfileMenuProps {
  displayName: string
  isConnected: boolean
  onlineCount: number
  onChangeName?: (name: string) => void
  onShareClick?: () => void
  remoteUsers?: Map<string, RemoteUser>
}

export function ProfileMenu({ 
  displayName, 
  isConnected, 
  onlineCount,
  onChangeName,
  onShareClick,
  remoteUsers = new Map(),
}: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(displayName)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [exportScale, setExportScale] = useState(2)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Load settings from localStorage
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('canvas_settings')
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings
  })
  
  const { exportBoard, importBoard, clearBoard, objects, setViewport } = useCanvasStore()
  
  // Save settings to localStorage
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('canvas_settings', JSON.stringify(newSettings))
    
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('canvas-settings-changed', { detail: newSettings }))
  }
  
  // Board speichern als .json Datei
  const handleSaveBoard = () => {
    const json = exportBoard()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `board-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setIsOpen(false)
  }
  
  // Board als hochauflösendes Bild speichern
  const handleSaveAsImage = useCallback(() => {
    // Get the Konva stage from the canvas
    const stage = (window as unknown as { __konvaStage?: { toDataURL: (config: { pixelRatio: number; mimeType: string; quality: number }) => string } }).__konvaStage
    if (!stage) {
      alert('Canvas nicht gefunden. Bitte versuche es erneut.')
      return
    }
    
    try {
      const dataURL = stage.toDataURL({
        pixelRatio: exportScale,
        mimeType: 'image/png',
        quality: 1,
      })
      
      const a = document.createElement('a')
      a.href = dataURL
      a.download = `board-${new Date().toISOString().slice(0,10)}-${exportScale}x.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      setShowExportOptions(false)
      setIsOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export fehlgeschlagen. Das Bild ist möglicherweise zu groß.')
    }
  }, [exportScale])
  
  // Board aus .json Datei laden
  const handleLoadBoard = () => {
    fileInputRef.current?.click()
  }
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const json = event.target?.result as string
      if (importBoard(json)) {
        setIsOpen(false)
      } else {
        alert('Fehler beim Laden des Boards')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }
  
  // Neues Board (alles löschen)
  const handleNewBoard = () => {
    if (objects.size === 0 || confirm('Alle Objekte löschen und neues Board erstellen?')) {
      clearBoard()
      setViewport({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 })
      setIsOpen(false)
    }
  }
  
  const handleSaveName = () => {
    if (nameInput.trim()) {
      localStorage.setItem('guest_name', nameInput.trim())
      onChangeName?.(nameInput.trim())
      setIsEditingName(false)
    }
  }
  
  // Get initials from name
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  // Participants Modal
  const ParticipantsModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={() => setShowParticipants(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 w-80 max-h-96 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-medium">Teilnehmer ({onlineCount})</h3>
          <button 
            onClick={() => setShowParticipants(false)}
            className="text-white/50 hover:text-white transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        
        <div className="p-2 max-h-72 overflow-y-auto">
          {/* Current user */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{displayName}</p>
              <p className="text-white/50 text-xs">Du</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          
          {/* Remote users */}
          {Array.from(remoteUsers.values()).map((user) => (
            <div key={user.userId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: user.color }}
              >
                {user.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{user.displayName}</p>
                <p className="text-white/50 text-xs">
                  Position: {Math.round(user.cursorX)}, {Math.round(user.cursorY)}
                </p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
          ))}
          
          {remoteUsers.size === 0 && (
            <p className="text-white/40 text-sm text-center p-4">
              Keine anderen Teilnehmer online
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
  
  // Settings Modal
  const SettingsModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={() => setShowSettings(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 w-96 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-medium">Einstellungen</h3>
          <button 
            onClick={() => setShowSettings(false)}
            className="text-white/50 hover:text-white transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Grid Settings */}
          <div className="space-y-3">
            <h4 className="text-white/60 text-xs font-medium uppercase tracking-wider">Raster</h4>
            
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">Raster anzeigen</span>
              <button
                onClick={() => updateSetting('showGrid', !settings.showGrid)}
                className={clsx(
                  'w-12 h-6 rounded-full transition-colors relative',
                  settings.showGrid ? 'bg-indigo-500' : 'bg-white/20'
                )}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                  animate={{ left: settings.showGrid ? '26px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">An Raster ausrichten</span>
              <button
                onClick={() => updateSetting('snapToGrid', !settings.snapToGrid)}
                className={clsx(
                  'w-12 h-6 rounded-full transition-colors relative',
                  settings.snapToGrid ? 'bg-indigo-500' : 'bg-white/20'
                )}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                  animate={{ left: settings.snapToGrid ? '26px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Rastergröße</span>
                <span className="text-white/60 text-sm">{settings.gridSize}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.gridSize}
                onChange={(e) => updateSetting('gridSize', Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
          
          {/* Cursor Settings */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h4 className="text-white/60 text-xs font-medium uppercase tracking-wider">Cursor</h4>
            
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">Andere Cursor anzeigen</span>
              <button
                onClick={() => updateSetting('showOtherCursors', !settings.showOtherCursors)}
                className={clsx(
                  'w-12 h-6 rounded-full transition-colors relative',
                  settings.showOtherCursors ? 'bg-indigo-500' : 'bg-white/20'
                )}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                  animate={{ left: settings.showOtherCursors ? '26px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">Cursor-Spur</span>
              <button
                onClick={() => updateSetting('cursorTrails', !settings.cursorTrails)}
                className={clsx(
                  'w-12 h-6 rounded-full transition-colors relative',
                  settings.cursorTrails ? 'bg-indigo-500' : 'bg-white/20'
                )}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                  animate={{ left: settings.cursorTrails ? '26px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
          
          {/* Other Settings */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h4 className="text-white/60 text-xs font-medium uppercase tracking-wider">Allgemein</h4>
            
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">Dark Mode</span>
              <button
                onClick={() => updateSetting('darkMode', !settings.darkMode)}
                className={clsx(
                  'w-12 h-6 rounded-full transition-colors relative',
                  settings.darkMode ? 'bg-indigo-500' : 'bg-white/20'
                )}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                  animate={{ left: settings.darkMode ? '26px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">Auto-Speichern</span>
              <button
                onClick={() => updateSetting('autoSave', !settings.autoSave)}
                className={clsx(
                  'w-12 h-6 rounded-full transition-colors relative',
                  settings.autoSave ? 'bg-indigo-500' : 'bg-white/20'
                )}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                  animate={{ left: settings.autoSave ? '26px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
          
          {/* Reset Button */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => {
                setSettings(defaultSettings)
                localStorage.setItem('canvas_settings', JSON.stringify(defaultSettings))
                window.dispatchEvent(new CustomEvent('canvas-settings-changed', { detail: defaultSettings }))
              }}
              className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
            >
              Einstellungen zurücksetzen
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
  
  // Export Options Modal
  const ExportOptionsModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={() => setShowExportOptions(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 w-80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-medium">Board exportieren</h3>
          <button 
            onClick={() => setShowExportOptions(false)}
            className="text-white/50 hover:text-white transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* JSON Export */}
          <button
            onClick={() => {
              setShowExportOptions(false)
              handleSaveBoard()
            }}
            className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <span className="text-white/70"><FileIcon size={24} /></span>
            <div className="text-left">
              <p className="text-white font-medium">Als JSON speichern</p>
              <p className="text-white/50 text-xs">Bearbeitbar, kann wieder geladen werden</p>
            </div>
          </button>
          
          {/* Image Export */}
          <div className="space-y-3">
            <button
              onClick={handleSaveAsImage}
              className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <span className="text-white/70"><ImageIcon size={24} /></span>
              <div className="text-left">
                <p className="text-white font-medium">Als Bild speichern (PNG)</p>
                <p className="text-white/50 text-xs">Hochauflösendes Bild exportieren</p>
              </div>
            </button>
            
            {/* Resolution selector */}
            <div className="px-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Auflösung</span>
                <span className="text-white text-sm">{exportScale}x</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 4, 8].map((scale) => (
                  <button
                    key={scale}
                    onClick={() => setExportScale(scale)}
                    className={clsx(
                      'flex-1 py-2 rounded-lg text-sm transition-colors',
                      exportScale === scale
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    )}
                  >
                    {scale}x
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-xs">
                Höhere Auflösung = größere Datei
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
  
  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Modals */}
      <AnimatePresence>
        {showParticipants && <ParticipantsModal />}
        {showSettings && <SettingsModal />}
        {showExportOptions && <ExportOptionsModal />}
      </AnimatePresence>
      
      {/* Expanded panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 50, y: -50 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 50, y: -50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute top-0 right-0 w-72 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {initials}
                </div>
                <div className="flex-1">
                  {isEditingName ? (
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      onBlur={handleSaveName}
                      autoFocus
                      className="w-full bg-white/10 rounded px-2 py-1 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-white font-medium hover:text-indigo-400 transition-colors text-left flex items-center gap-2"
                    >
                      {displayName}
                      <span className="text-white/40"><EditIcon size={12} /></span>
                    </button>
                  )}
                  <p className="text-white/50 text-xs mt-0.5">Gast</p>
                </div>
              </div>
            </div>
            
            {/* Status */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Status</span>
                <div className="flex items-center gap-2">
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  <span className="text-white text-sm">
                    {isConnected ? 'Verbunden' : 'Getrennt'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Online</span>
                <span className="text-white text-sm">{onlineCount} Personen</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-2 border-t border-white/10">
              {/* Board Management */}
              <div className="px-2 py-1 text-white/40 text-xs font-medium">Board</div>
              <button 
                onClick={handleNewBoard}
                className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 rounded-lg text-sm transition-colors flex items-center gap-3"
              >
                <span className="text-white/50"><FilePlusIcon size={18} /></span>
                <span>Neues Board</span>
              </button>
              <button 
                onClick={() => setShowExportOptions(true)}
                className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 rounded-lg text-sm transition-colors flex items-center gap-3"
              >
                <span className="text-white/50"><SaveIcon size={18} /></span>
                <span>Board speichern</span>
              </button>
              <button 
                onClick={handleLoadBoard}
                className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 rounded-lg text-sm transition-colors flex items-center gap-3"
              >
                <span className="text-white/50"><FolderOpenIcon size={18} /></span>
                <span>Board laden</span>
              </button>
              
              {/* Sharing */}
              <div className="px-2 py-1 mt-2 text-white/40 text-xs font-medium">Teilen</div>
              <button 
                onClick={() => {
                  setIsOpen(false)
                  onShareClick?.()
                }}
                className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 rounded-lg text-sm transition-colors flex items-center gap-3"
              >
                <span className="text-white/50"><LinkIcon size={18} /></span>
                <span>Link teilen</span>
              </button>
              <button 
                onClick={() => setShowParticipants(true)}
                className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 rounded-lg text-sm transition-colors flex items-center gap-3"
              >
                <span className="text-white/50"><UsersIcon size={18} /></span>
                <span>Teilnehmer anzeigen</span>
                <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {onlineCount}
                </span>
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 rounded-lg text-sm transition-colors flex items-center gap-3"
              >
                <span className="text-white/50"><SettingsIcon size={18} /></span>
                <span>Einstellungen</span>
              </button>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <p className="text-white/40 text-xs text-center">
                Infinite Canvas v0.1.0
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Collapsed avatar button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'relative flex items-center gap-2 px-3 py-2 rounded-full',
          'bg-black/60 backdrop-blur-xl border border-white/10',
          'transition-all duration-300 hover:bg-black/80',
          isOpen && 'opacity-0 pointer-events-none'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Connection indicator */}
        <div className={clsx(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-red-500'
        )} />
        
        {/* Online count */}
        <span className="text-white/70 text-sm">
          {onlineCount}
        </span>
        
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
      </motion.button>
      
      {/* Close button when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-colors"
          >
            <CloseIcon size={16} />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Hidden file input for importing boards */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
