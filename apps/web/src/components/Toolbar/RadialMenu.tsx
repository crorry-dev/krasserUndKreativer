import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCanvasStore, Tool, ShapeType } from '@/stores/canvasStore'
import clsx from 'clsx'
import {
  PenIcon,
  EraserIcon,
  SelectIcon,
  ShapeIcon,
  TextIcon,
  StickyNoteIcon,
  HandIcon,
  RectIcon,
  CircleIcon,
  TriangleIcon,
  DiamondIcon,
  LineIcon,
  ArrowIcon,
  PlusIcon,
  MinusIcon,
  CloseIcon,
  UndoIcon,
  RedoIcon,
  HistoryIcon,
  ZoomInIcon,
  ZoomOutIcon,
  NoFillIcon,
  MediaIcon,
  DownloadIcon,
} from '@/components/Icons'

// Predefined color palette
const colorPalette = [
  '#ffffff', // White
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#000000', // Black
]

// Sticky note colors
const stickyColors = [
  '#FEF08A', // Yellow
  '#BBF7D0', // Green  
  '#FBCFE8', // Pink
  '#DDD6FE', // Purple
  '#BAE6FD', // Blue
  '#FED7AA', // Orange
  '#FECACA', // Red
  '#E5E7EB', // Gray
]

const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: 'pen', icon: <PenIcon size={20} />, label: 'Zeichnen' },
  { id: 'eraser', icon: <EraserIcon size={20} />, label: 'Radierer' },
  { id: 'select', icon: <SelectIcon size={20} />, label: 'Auswählen' },
  { id: 'shape', icon: <ShapeIcon size={20} />, label: 'Form' },
  { id: 'text', icon: <TextIcon size={20} />, label: 'Text' },
  { id: 'sticky', icon: <StickyNoteIcon size={20} />, label: 'Notiz' },
  { id: 'pan', icon: <HandIcon size={20} />, label: 'Bewegen' },
]

const shapeTypes: { id: ShapeType; icon: React.ReactNode; label: string }[] = [
  { id: 'rect', icon: <RectIcon size={16} />, label: 'Rechteck' },
  { id: 'circle', icon: <CircleIcon size={16} />, label: 'Kreis' },
  { id: 'triangle', icon: <TriangleIcon size={16} />, label: 'Dreieck' },
  { id: 'diamond', icon: <DiamondIcon size={16} />, label: 'Raute' },
  { id: 'line', icon: <LineIcon size={16} />, label: 'Linie' },
  { id: 'arrow', icon: <ArrowIcon size={16} />, label: 'Pfeil' },
]

interface RadialMenuProps {
  onHistoryClick?: () => void
  onMediaClick?: () => void
  onExportClick?: () => void
}

export function RadialMenu({ onHistoryClick, onMediaClick, onExportClick }: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSizeSlider, setShowSizeSlider] = useState(true)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [hoveredTool, setHoveredTool] = useState<Tool | null>(null)
  const [isRightMouseDown, setIsRightMouseDown] = useState(false)
  const { currentTool, setTool, viewport, setViewport, toolSettings, setToolSettings, undo, redo, canUndo, canRedo } = useCanvasStore()
  
  const handleToolSelect = useCallback((tool: Tool) => {
    setTool(tool)
    // Show size slider for tools that support it
    if (tool === 'pen' || tool === 'eraser' || tool === 'text' || tool === 'shape') {
      setShowSizeSlider(true)
    } else {
      setShowSizeSlider(false)
    }
    setIsOpen(false)
    setHoveredTool(null)
  }, [setTool])
  
  // Rechtsklick-Release: Wähle das Tool unter dem Cursor und schließe das Menü
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2 && isOpen && isRightMouseDown) {
        // Wenn ein Tool gehighlighted ist, wähle es aus
        if (hoveredTool) {
          handleToolSelect(hoveredTool)
        }
        setIsOpen(false)
        setIsRightMouseDown(false)
        setHoveredTool(null)
      }
    }
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2 && isOpen) {
        setIsRightMouseDown(true)
      }
    }
    
    const handleContextMenu = (e: MouseEvent) => {
      // Verhindere Standard-Kontextmenü wenn unser Menü offen ist
      if (isOpen) {
        e.preventDefault()
      }
    }
    
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('contextmenu', handleContextMenu)
    
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [isOpen, hoveredTool, isRightMouseDown, handleToolSelect])
  
  const handleShapeSelect = (shapeType: ShapeType) => {
    setToolSettings({ shapeType })
  }
  
  const handleColorSelect = (color: string) => {
    setToolSettings({ color })
    setShowColorPicker(false)
  }
  
  const handleZoomIn = () => {
    const newScale = viewport.scale * 1.5
    setViewport({ scale: newScale })
  }
  
  const handleZoomOut = () => {
    const newScale = Math.max(0.001, viewport.scale / 1.5)
    setViewport({ scale: newScale })
  }
  
  const handleReset = () => {
    setViewport({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 })
  }
  
  // Get current size value based on tool
  const getCurrentSize = () => {
    switch (currentTool) {
      case 'pen': return toolSettings.strokeWidth
      case 'eraser': return toolSettings.eraserWidth
      case 'text': return toolSettings.fontSize
      case 'shape': return toolSettings.strokeWidth
      default: return toolSettings.strokeWidth
    }
  }
  
  // Set size based on tool
  const setCurrentSize = (value: number) => {
    switch (currentTool) {
      case 'pen': 
      case 'shape':
        setToolSettings({ strokeWidth: value })
        break
      case 'eraser': 
        setToolSettings({ eraserWidth: value })
        break
      case 'text': 
        setToolSettings({ fontSize: value })
        break
    }
  }
  
  // Zoom color
  const getZoomColor = () => {
    const scale = viewport.scale
    if (scale <= 1) return '#4ade80'
    if (scale <= 10) return '#a3e635'
    if (scale <= 50) return '#facc15'
    if (scale <= 200) return '#fb923c'
    if (scale <= 1000) return '#f87171'
    return '#ef4444'
  }
  
  // Format zoom display
  const formatZoom = () => {
    const scale = viewport.scale
    if (scale >= 1000000) return `${(scale / 1000000).toFixed(0)}M%`
    if (scale >= 1000) return `${(scale / 1000).toFixed(0)}k%`
    if (scale >= 10) return `${Math.round(scale * 100)}%`
    return `${(scale * 100).toFixed(1)}%`
  }
  
  const currentToolData = tools.find(t => t.id === currentTool)
  const currentToolIcon = currentToolData?.icon || <PenIcon size={20} />
  const currentToolLabel = currentToolData?.label || ''
  
  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Radial menu items */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Tools in horizontal row to the right - NEVER goes outside viewport */}
            {tools.map((tool, index) => {
              // Horizontal layout to the right of the main button
              const spacing = 52
              const x = 70 + (index * spacing) // Start 70px to the right, then space evenly
              const y = 0 // Same level as main button
              const isHovered = hoveredTool === tool.id
              const isSelected = currentTool === tool.id
              
              return (
                <motion.button
                  key={tool.id}
                  initial={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: isHovered ? 1.15 : (isSelected ? 1.1 : 1), 
                    x: x, 
                    y: y,
                  }}
                  exit={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
                  transition={{ 
                    type: 'spring', 
                    damping: 25, 
                    stiffness: 500,
                    delay: index * 0.015,
                  }}
                  onClick={() => handleToolSelect(tool.id)}
                  onMouseEnter={() => setHoveredTool(tool.id)}
                  onMouseLeave={() => setHoveredTool(null)}
                  className={clsx(
                    'absolute w-11 h-11 rounded-full flex items-center justify-center',
                    'shadow-lg border transition-colors duration-150',
                    isSelected
                      ? 'bg-white text-black border-white'
                      : isHovered
                        ? 'bg-white/90 text-black border-white ring-2 ring-white/50'
                        : 'bg-black/80 text-white border-white/20 backdrop-blur-xl hover:bg-white/20'
                  )}
                  style={{ left: 0, bottom: 0 }}
                  title={tool.label}
                >
                  {tool.icon}
                </motion.button>
              )
            })}
            
            {/* Zoom controls - above tools row */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{ opacity: 1, scale: 1, x: 70, y: -60 }}
              exit={{ opacity: 0, scale: 0.5, y: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 500, delay: 0.1 }}
              className="absolute flex items-center gap-1 bg-black/80 backdrop-blur-xl rounded-full p-1 border border-white/20"
              style={{ left: 0, bottom: 0 }}
            >
              <button
                onClick={handleZoomOut}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <ZoomOutIcon size={16} />
              </button>
              <button
                onClick={handleReset}
                className="px-2 h-8 flex items-center justify-center hover:bg-white/10 text-xs font-mono font-semibold transition-colors min-w-[50px]"
                style={{ color: getZoomColor() }}
              >
                {formatZoom()}
              </button>
              <button
                onClick={handleZoomIn}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <ZoomInIcon size={16} />
              </button>
            </motion.div>
            
            {/* Undo/Redo buttons */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: 0 }}
              animate={{ opacity: 1, scale: 1, x: 200, y: -60 }}
              exit={{ opacity: 0, scale: 0.5, x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 500, delay: 0.12 }}
              className="absolute flex items-center gap-1 bg-black/80 backdrop-blur-xl rounded-full p-1 border border-white/20"
              style={{ left: 0, bottom: 0 }}
            >
              <button
                onClick={undo}
                disabled={!canUndo()}
                className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                  canUndo() ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-white/20 cursor-not-allowed'
                )}
                title="Rückgängig (⌘Z)"
              >
                <UndoIcon size={16} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo()}
                className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                  canRedo() ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-white/20 cursor-not-allowed'
                )}
                title="Wiederholen (⌘⇧Z)"
              >
                <RedoIcon size={16} />
              </button>
            </motion.div>
            
            {/* History button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 0 }}
              animate={{ opacity: 1, scale: 1, x: 290, y: -60 }}
              exit={{ opacity: 0, scale: 0.5, x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 500, delay: 0.14 }}
              onClick={() => {
                setIsOpen(false)
                onHistoryClick?.()
              }}
              className="absolute w-11 h-11 rounded-full flex items-center justify-center bg-black/80 text-white backdrop-blur-xl shadow-lg border border-white/20 hover:bg-white/20 transition-colors"
              style={{ left: 0, bottom: 0 }}
              title="Verlauf"
            >
              <HistoryIcon size={20} />
            </motion.button>
            
            {/* Media upload button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 0 }}
              animate={{ opacity: 1, scale: 1, x: 345, y: -60 }}
              exit={{ opacity: 0, scale: 0.5, x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 500, delay: 0.16 }}
              onClick={() => {
                setIsOpen(false)
                onMediaClick?.()
              }}
              className="absolute w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-600 text-white backdrop-blur-xl shadow-lg border border-white/20 hover:scale-105 transition-all"
              style={{ left: 0, bottom: 0 }}
              title="Medien hochladen (Bilder, Videos, Audio)"
            >
              <MediaIcon size={20} />
            </motion.button>
            
            {/* Export button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 0 }}
              animate={{ opacity: 1, scale: 1, x: 400, y: -60 }}
              exit={{ opacity: 0, scale: 0.5, x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 500, delay: 0.18 }}
              onClick={() => {
                setIsOpen(false)
                onExportClick?.()
              }}
              className="absolute w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 text-white backdrop-blur-xl shadow-lg border border-white/20 hover:scale-105 transition-all"
              style={{ left: 0, bottom: 0 }}
              title="Canvas exportieren (PNG, SVG, JSON)"
            >
              <DownloadIcon size={20} />
            </motion.button>
          </>
        )}
      </AnimatePresence>
      
      {/* Color picker popup */}
      <AnimatePresence>
        {showColorPicker && (currentTool === 'pen' || currentTool === 'shape' || currentTool === 'text') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="absolute bottom-20 left-0 bg-black/90 backdrop-blur-xl rounded-2xl p-3 border border-white/20 shadow-2xl"
          >
            <div className="flex flex-col gap-3">
              {/* Preset colors */}
              <div className="grid grid-cols-5 gap-2">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className={clsx(
                      'w-8 h-8 rounded-full border-2 transition-all hover:scale-110',
                      toolSettings.color === color ? 'border-white scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              
              {/* Custom color input */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <input
                  type="color"
                  value={toolSettings.color}
                  onChange={(e) => setToolSettings({ color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={toolSettings.color}
                  onChange={(e) => setToolSettings({ color: e.target.value })}
                  className="flex-1 bg-white/10 text-white text-xs font-mono px-2 py-1 rounded border border-white/10 outline-none focus:border-white/30"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Size slider with color button - shows when tool supports sizing - always visible */}
      <AnimatePresence>
        {showSizeSlider && (currentTool === 'pen' || currentTool === 'eraser' || currentTool === 'text' || currentTool === 'shape') && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 70, y: isOpen ? -115 : 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="absolute flex items-center gap-2 bg-black/80 backdrop-blur-xl rounded-full px-3 py-2 border border-white/20"
            style={{ left: 0, bottom: 8 }}
          >
            {/* Color button (not for eraser) */}
            {currentTool !== 'eraser' && (
              <>
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-6 h-6 rounded-full border-2 border-white/30 hover:border-white transition-colors flex-shrink-0"
                  style={{ backgroundColor: toolSettings.color }}
                  title="Farbe wählen"
                />
                <div className="w-px h-5 bg-white/20" />
              </>
            )}
            
            <button
              onClick={() => setCurrentSize(getCurrentSize() / 2)}
              className="text-white/50 hover:text-white w-5 h-5 flex items-center justify-center"
            >
              <MinusIcon size={14} />
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.log10(getCurrentSize() + 1) * 25}
              onChange={(e) => {
                // Logarithmic scale: slider 0-100 maps to size 0.001 - 1000000
                const sliderVal = parseFloat(e.target.value)
                const size = Math.pow(10, sliderVal / 25) - 1
                setCurrentSize(Math.max(0.001, size))
              }}
              className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <button
              onClick={() => setCurrentSize(getCurrentSize() * 2)}
              className="text-white/50 hover:text-white w-5 h-5 flex items-center justify-center"
            >
              <PlusIcon size={14} />
            </button>
            <span className="text-white/70 text-xs font-mono min-w-[40px] text-right">
              {getCurrentSize() >= 1000 ? `${(getCurrentSize()/1000).toFixed(0)}k` : getCurrentSize().toFixed(getCurrentSize() < 1 ? 2 : 0)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Shape type selector - shows when shape tool is selected - always visible */}
      <AnimatePresence>
        {currentTool === 'shape' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 70, y: isOpen ? -112 : -52 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400, delay: 0.05 }}
            className="absolute flex items-center gap-1 bg-black/80 backdrop-blur-xl rounded-full px-2 py-1.5 border border-white/20"
            style={{ left: 0, bottom: 8 }}
          >
            {shapeTypes.map((shape) => (
              <button
                key={shape.id}
                onClick={() => handleShapeSelect(shape.id)}
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                  toolSettings.shapeType === shape.id
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
                title={shape.label}
              >
                {shape.icon}
              </button>
            ))}
            {/* Fill color picker */}
            <div className="w-px h-6 bg-white/20 mx-1" />
            <input
              type="color"
              value={toolSettings.fillColor === 'transparent' ? '#000000' : toolSettings.fillColor}
              onChange={(e) => setToolSettings({ fillColor: e.target.value })}
              className="w-6 h-6 rounded-full cursor-pointer border border-white/20 bg-transparent"
              title="Füllfarbe"
            />
            <button
              onClick={() => setToolSettings({ fillColor: 'transparent' })}
              className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center border transition-all',
                toolSettings.fillColor === 'transparent' 
                  ? 'border-white bg-white/20 text-white' 
                  : 'border-white/20 text-white/50 hover:text-white'
              )}
              title="Keine Füllung"
            >
              <NoFillIcon size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sticky note color selector - shows when sticky tool is selected */}
      <AnimatePresence>
        {currentTool === 'sticky' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 70, y: isOpen ? -112 : 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400, delay: 0.05 }}
            className="absolute flex items-center gap-1 bg-black/80 backdrop-blur-xl rounded-full px-2 py-1.5 border border-white/20"
            style={{ left: 0, bottom: 8 }}
          >
            <span className="text-white/50 text-xs px-1">Farbe:</span>
            {stickyColors.map((color) => (
              <button
                key={color}
                onClick={() => setToolSettings({ stickyColor: color })}
                className={clsx(
                  'w-7 h-7 rounded-full transition-all border-2',
                  toolSettings.stickyColor === color
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-transparent hover:scale-105 hover:border-white/30'
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main FAB button */}
      <motion.button
        onClick={() => {
          setIsOpen(!isOpen)
          if (isOpen) setShowColorPicker(false)
        }}
        className={clsx(
          'relative w-14 h-14 rounded-full flex items-center justify-center',
          'bg-gradient-to-br shadow-2xl border border-white/20',
          'transition-all duration-200',
          isOpen 
            ? 'from-red-500 to-pink-600' 
            : 'from-indigo-500 to-purple-600'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {isOpen ? (
          <CloseIcon size={24} className="text-white" />
        ) : (
          <span className="text-white">{currentToolIcon}</span>
        )}
      </motion.button>
      
      {/* Current tool indicator */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/60 text-white text-xs whitespace-nowrap"
        >
          {currentToolLabel}
        </motion.div>
      )}
    </div>
  )
}
