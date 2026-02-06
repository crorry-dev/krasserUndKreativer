import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserSettingsStore } from '../../stores/userSettingsStore'

interface AvatarEditorProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Avatar-Editor mit Bild-Upload, Zoom und Cropping
 */
export function AvatarEditor({ isOpen, onClose }: AvatarEditorProps) {
  const { profile, setAvatar } = useUserSettingsStore()
  
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Lade existierendes Bild beim Öffnen
  useEffect(() => {
    if (isOpen && profile.avatarDataUrl) {
      // Für Edit: Original-Bild laden (hier vereinfacht - wir nehmen das cropped)
      setImageSrc(profile.avatarDataUrl)
      setZoom(profile.avatarCrop?.zoom || 1)
      setPosition({ 
        x: profile.avatarCrop?.x || 0, 
        y: profile.avatarCrop?.y || 0 
      })
    }
  }, [isOpen, profile.avatarDataUrl, profile.avatarCrop])
  
  // Reset beim Schließen
  const handleClose = () => {
    setImageSrc(null)
    setZoom(1)
    setPosition({ x: 0, y: 0 })
    onClose()
  }
  
  // Datei-Upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validierung
    if (!file.type.startsWith('image/')) {
      alert('Bitte wähle eine Bilddatei aus.')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Das Bild darf maximal 5MB groß sein.')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string)
      setZoom(1)
      setPosition({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }
  
  // Drag-Start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }
  
  // Drag-Move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }, [isDragging, dragStart])
  
  // Drag-End
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  // Mouse-Events
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])
  
  // Zoom mit Mausrad
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)))
  }
  
  // Bild speichern (croppen und als Base64)
  const handleSave = () => {
    if (!imageSrc || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Canvas für finales Bild (128x128 für Avatar)
    const size = 128
    canvas.width = size
    canvas.height = size
    
    // Bild laden und croppen
    const img = new Image()
    img.onload = () => {
      // Hintergrund transparent
      ctx.clearRect(0, 0, size, size)
      
      // Kreisförmiger Clip
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.clip()
      
      // Bild zeichnen mit Zoom und Position
      const scaledWidth = img.width * zoom
      const scaledHeight = img.height * zoom
      const offsetX = (size - scaledWidth) / 2 + position.x
      const offsetY = (size - scaledHeight) / 2 + position.y
      
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
      
      // Als Data URL speichern
      const dataUrl = canvas.toDataURL('image/png')
      setAvatar(dataUrl, { x: position.x, y: position.y, zoom })
      handleClose()
    }
    img.src = imageSrc
  }
  
  // Avatar löschen
  const handleRemove = () => {
    setAvatar(null)
    handleClose()
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Profilbild bearbeiten</h2>
              <button
                onClick={handleClose}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {/* Preview Area */}
              <div 
                className="relative mx-auto w-48 h-48 rounded-full overflow-hidden 
                           bg-zinc-800 border-2 border-zinc-700 cursor-move"
                onMouseDown={handleMouseDown}
                onWheel={handleWheel}
              >
                {imageSrc ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                    }}
                  >
                    <img
                      src={imageSrc}
                      alt="Avatar preview"
                      className="max-w-none pointer-events-none"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                    <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm">Kein Bild</span>
                  </div>
                )}
              </div>
              
              {/* Hidden Canvas für Cropping */}
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Zoom Slider */}
              {imageSrc && (
                <div className="mt-4">
                  <label className="block text-sm text-zinc-400 mb-2">
                    Zoom: {Math.round(zoom * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Ziehe das Bild um es zu positionieren
                  </p>
                </div>
              )}
              
              {/* Upload Button */}
              <div className="mt-6 flex flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 
                             text-white rounded-xl font-medium transition-colors
                             flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {imageSrc ? 'Anderes Bild wählen' : 'Bild hochladen'}
                </button>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  {profile.avatarDataUrl && (
                    <button
                      onClick={handleRemove}
                      className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/30 
                                 text-red-400 rounded-xl font-medium transition-colors"
                    >
                      Entfernen
                    </button>
                  )}
                  
                  <button
                    onClick={handleSave}
                    disabled={!imageSrc}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 
                               text-white rounded-xl font-medium transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AvatarEditor
