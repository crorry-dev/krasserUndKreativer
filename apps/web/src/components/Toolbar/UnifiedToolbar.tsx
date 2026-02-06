import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCanvasStore, TOOL_HOTBAR, Tool, ShapeType } from '../../stores/canvasStore'
import { getToolInfo } from '../../hooks/useToolHotbar'
import clsx from 'clsx'
import {
  MousePointer2,
  Pencil,
  Eraser,
  Square,
  Type,
  StickyNote,
  GitBranch,
  Hand,
  Target,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Undo2,
  Redo2,
  History,
  Image,
  ZoomIn,
  ZoomOut,
  Minus,
  Plus,
  Circle,
  Triangle,
  Diamond,
  ArrowRight,
  Slash,
  MapPin,
} from 'lucide-react'

interface UnifiedToolbarProps {
  onHistoryClick?: () => void
  onMediaClick?: () => void
  onWorkspaceClick?: () => void
  className?: string
}

// Shape types mit Icons
const shapeTypes: { id: ShapeType; icon: React.ReactNode; label: string }[] = [
  { id: 'rect', icon: <Square size={16} />, label: 'Rechteck' },
  { id: 'circle', icon: <Circle size={16} />, label: 'Kreis' },
  { id: 'triangle', icon: <Triangle size={16} />, label: 'Dreieck' },
  { id: 'diamond', icon: <Diamond size={16} />, label: 'Raute' },
  { id: 'line', icon: <Slash size={16} />, label: 'Linie' },
  { id: 'arrow', icon: <ArrowRight size={16} />, label: 'Pfeil' },
]

// Sticky note Farben
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

// Standard Farben
const standardColors = [
  '#ffffff', '#000000', '#ff0000', '#ff8800', '#ffff00',
  '#00ff00', '#00ffff', '#0088ff', '#0000ff', '#8800ff',
  '#ff00ff', '#ff0088',
]

/**
 * Tool-Icon basierend auf Tool-Typ
 */
function ToolIcon({ tool, size = 20 }: { tool: Tool; size?: number }) {
  const iconProps = { size, strokeWidth: 1.5 }
  
  switch (tool) {
    case 'select':
      return <MousePointer2 {...iconProps} />
    case 'pen':
      return <Pencil {...iconProps} />
    case 'eraser':
      return <Eraser {...iconProps} />
    case 'shape':
      return <Square {...iconProps} />
    case 'text':
      return <Type {...iconProps} />
    case 'sticky':
      return <StickyNote {...iconProps} />
    case 'connector':
      return <GitBranch {...iconProps} />
    case 'pan':
      return <Hand {...iconProps} />
    case 'laser':
      return <Target {...iconProps} />
    default:
      return <Square {...iconProps} />
  }
}

/**
 * Unified Toolbar - Bottom-Center
 * Kombiniert ToolHotbar und RadialMenu in einer ausklappbaren Toolbar
 */
export function UnifiedToolbar({ 
  onHistoryClick, 
  onMediaClick,
  onWorkspaceClick, 
  className = '' 
}: UnifiedToolbarProps) {
  const [isToolbarVisible, setIsToolbarVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  
  const currentTool = useCanvasStore((state) => state.currentTool)
  const lastUsedTool = useCanvasStore((state) => state.lastUsedTool)
  const setTool = useCanvasStore((state) => state.setTool)
  const setLastUsedTool = useCanvasStore((state) => state.setLastUsedTool)
  const viewport = useCanvasStore((state) => state.viewport)
  const setViewport = useCanvasStore((state) => state.setViewport)
  const toolSettings = useCanvasStore((state) => state.toolSettings)
  const setToolSettings = useCanvasStore((state) => state.setToolSettings)
  const undo = useCanvasStore((state) => state.undo)
  const redo = useCanvasStore((state) => state.redo)
  const canUndo = useCanvasStore((state) => state.canUndo)
  const canRedo = useCanvasStore((state) => state.canRedo)

  const handleToolClick = useCallback((tool: Tool) => {
    if (currentTool !== tool) {
      setLastUsedTool(currentTool)
      setTool(tool)
    }
    // Collapse wenn das gleiche Tool nochmal geklickt wird
    if (currentTool === tool && isExpanded) {
      setIsExpanded(false)
    } else if (currentTool === tool) {
      setIsExpanded(true)
    }
    setShowColorPicker(false)
  }, [currentTool, isExpanded, setLastUsedTool, setTool])

  const handleQuickSwitch = useCallback(() => {
    if (lastUsedTool !== currentTool) {
      const temp = currentTool
      setTool(lastUsedTool)
      setLastUsedTool(temp)
    }
  }, [currentTool, lastUsedTool, setLastUsedTool, setTool])

  // Get current size based on tool
  const getCurrentSize = useCallback(() => {
    switch (currentTool) {
      case 'pen': return toolSettings.strokeWidth
      case 'eraser': return toolSettings.eraserWidth
      case 'text': return toolSettings.fontSize
      case 'shape': return toolSettings.strokeWidth
      default: return toolSettings.strokeWidth
    }
  }, [currentTool, toolSettings])

  // Set size based on tool
  const setCurrentSize = useCallback((value: number) => {
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
  }, [currentTool, setToolSettings])

  // Zoom
  const handleZoom = useCallback((factor: number) => {
    const newScale = Math.max(0.01, Math.min(100000, viewport.scale * factor))
    setViewport({ scale: newScale })
  }, [viewport.scale, setViewport])

  // Format zoom display
  const formatZoom = useCallback(() => {
    const scale = viewport.scale
    if (scale >= 1000000) return `${(scale / 1000000).toFixed(0)}M%`
    if (scale >= 1000) return `${(scale / 1000).toFixed(0)}k%`
    if (scale >= 10) return `${Math.round(scale * 100)}%`
    return `${(scale * 100).toFixed(1)}%`
  }, [viewport.scale])

  // Check if tool has settings panel
  const hasToolSettings = ['pen', 'eraser', 'text', 'shape', 'sticky', 'connector', 'laser'].includes(currentTool)

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 ${className}`}>
      {/* Aufklapp-Button wenn Toolbar eingeklappt */}
      <AnimatePresence>
        {!isToolbarVisible && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={() => setIsToolbarVisible(true)}
            className="w-14 h-14 flex items-center justify-center bg-zinc-900/95 backdrop-blur-xl rounded-full border border-zinc-700/50 shadow-2xl text-zinc-400 hover:bg-zinc-800 hover:text-white hover:scale-110 transition-all"
            title="Toolbar öffnen"
          >
            <ChevronUp size={28} />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Die eigentliche Toolbar */}
      <AnimatePresence>
        {isToolbarVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Expanded Settings Panel */}
            <AnimatePresence>
              {isExpanded && hasToolSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                  className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-3 shadow-2xl mb-2"
                >
            {/* Pen Settings */}
            {currentTool === 'pen' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {/* Color Button */}
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-8 h-8 rounded-lg border-2 border-zinc-600 hover:border-zinc-400 transition-colors flex-shrink-0"
                    style={{ backgroundColor: toolSettings.color }}
                    title="Farbe wählen"
                  />
                  
                  {/* Size Slider */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentSize(getCurrentSize() / 2)}
                      className="text-zinc-400 hover:text-white w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.log10(getCurrentSize() + 1) * 25}
                      onChange={(e) => {
                        const sliderVal = parseFloat(e.target.value)
                        const size = Math.pow(10, sliderVal / 25) - 1
                        setCurrentSize(Math.max(0.001, size))
                      }}
                      className="w-32 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <button
                      onClick={() => setCurrentSize(getCurrentSize() * 2)}
                      className="text-zinc-400 hover:text-white w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="text-xs text-zinc-400 w-12 text-right font-mono">
                      {getCurrentSize().toFixed(1)}
                    </span>
                  </div>
                </div>
                
                {/* Color Picker */}
                <AnimatePresence>
                  {showColorPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-700"
                    >
                      {standardColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setToolSettings({ color })
                            setShowColorPicker(false)
                          }}
                          className={clsx(
                            'w-7 h-7 rounded-lg border-2 transition-all hover:scale-110',
                            toolSettings.color === color ? 'border-white scale-110' : 'border-transparent hover:border-zinc-400'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <input
                        type="color"
                        value={toolSettings.color}
                        onChange={(e) => setToolSettings({ color: e.target.value })}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Eraser Settings */}
            {currentTool === 'eraser' && (
              <div className="flex items-center gap-2">
                <Eraser size={16} className="text-zinc-400" />
                <button
                  onClick={() => setCurrentSize(getCurrentSize() / 2)}
                  className="text-zinc-400 hover:text-white w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.log10(getCurrentSize() + 1) * 25}
                  onChange={(e) => {
                    const sliderVal = parseFloat(e.target.value)
                    const size = Math.pow(10, sliderVal / 25) - 1
                    setCurrentSize(Math.max(0.001, size))
                  }}
                  className="w-32 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-white"
                />
                <button
                  onClick={() => setCurrentSize(getCurrentSize() * 2)}
                  className="text-zinc-400 hover:text-white w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700"
                >
                  <Plus size={14} />
                </button>
                <span className="text-xs text-zinc-400 w-12 text-right font-mono">
                  {getCurrentSize().toFixed(1)}
                </span>
              </div>
            )}

            {/* Text Settings */}
            {currentTool === 'text' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 rounded-lg border-2 border-zinc-600 hover:border-zinc-400 transition-colors flex-shrink-0"
                  style={{ backgroundColor: toolSettings.color }}
                  title="Textfarbe"
                />
                <div className="flex items-center gap-2">
                  <Type size={16} className="text-zinc-400" />
                  <button
                    onClick={() => setCurrentSize(Math.max(8, getCurrentSize() - 4))}
                    className="text-zinc-400 hover:text-white w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm text-white w-8 text-center font-mono">
                    {Math.round(getCurrentSize())}
                  </span>
                  <button
                    onClick={() => setCurrentSize(Math.min(200, getCurrentSize() + 4))}
                    className="text-zinc-400 hover:text-white w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                
                {showColorPicker && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-1 ml-2"
                  >
                    {standardColors.slice(0, 6).map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setToolSettings({ color })
                          setShowColorPicker(false)
                        }}
                        className={clsx(
                          'w-6 h-6 rounded border-2 transition-all',
                          toolSettings.color === color ? 'border-white' : 'border-transparent hover:border-zinc-400'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* Shape Settings */}
            {currentTool === 'shape' && (
              <div className="flex flex-col gap-3">
                {/* Shape Type Selection */}
                <div className="flex items-center gap-1">
                  {shapeTypes.map((shape) => (
                    <button
                      key={shape.id}
                      onClick={() => setToolSettings({ shapeType: shape.id })}
                      className={clsx(
                        'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                        toolSettings.shapeType === shape.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                      )}
                      title={shape.label}
                    >
                      {shape.icon}
                    </button>
                  ))}
                </div>
                
                {/* Color & Stroke */}
                <div className="flex items-center gap-3 pt-2 border-t border-zinc-700">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-7 h-7 rounded border-2 border-zinc-600 hover:border-zinc-400 transition-colors"
                    style={{ backgroundColor: toolSettings.color }}
                    title="Linienfarbe"
                  />
                  <input
                    type="color"
                    value={toolSettings.fillColor === 'transparent' ? '#000000' : toolSettings.fillColor}
                    onChange={(e) => setToolSettings({ fillColor: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                    title="Füllfarbe"
                  />
                  <button
                    onClick={() => setToolSettings({ fillColor: 'transparent' })}
                    className={clsx(
                      'w-7 h-7 rounded flex items-center justify-center border transition-all',
                      toolSettings.fillColor === 'transparent' 
                        ? 'border-white bg-zinc-700 text-white' 
                        : 'border-zinc-600 text-zinc-400 hover:text-white'
                    )}
                    title="Keine Füllung"
                  >
                    <Slash size={14} />
                  </button>
                  <div className="w-px h-6 bg-zinc-700" />
                  <div className="flex items-center gap-1">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={toolSettings.strokeWidth}
                      onChange={(e) => setToolSettings({ strokeWidth: parseFloat(e.target.value) })}
                      className="w-20 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white"
                    />
                    <span className="text-xs text-zinc-400 w-6 text-right">{toolSettings.strokeWidth}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sticky Note Settings */}
            {currentTool === 'sticky' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-400 mr-1">Farbe:</span>
                {stickyColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setToolSettings({ stickyColor: color })}
                    className={clsx(
                      'w-8 h-8 rounded-lg transition-all border-2',
                      toolSettings.stickyColor === color
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105 hover:border-zinc-400'
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}

            {/* Connector Settings */}
            {currentTool === 'connector' && (
              <div className="flex flex-col gap-3">
                {/* Line Type */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Linie:</span>
                  <div className="flex gap-1">
                    {(['straight', 'curved', 'elbow'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setToolSettings({ connectorLineType: type })}
                        className={clsx(
                          'px-2.5 py-1.5 rounded-lg text-xs transition-all',
                          toolSettings.connectorLineType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                        )}
                      >
                        {type === 'straight' ? 'Gerade' : type === 'curved' ? 'Kurve' : 'Winkel'}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Arrow Types */}
                <div className="flex items-center gap-3 pt-2 border-t border-zinc-700">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500">Start:</span>
                    <select
                      value={toolSettings.connectorStartArrow}
                      onChange={(e) => setToolSettings({ connectorStartArrow: e.target.value as 'none' | 'arrow' | 'dot' | 'diamond' })}
                      className="bg-zinc-800 text-white text-xs rounded px-2 py-1 border border-zinc-700"
                    >
                      <option value="none">Keine</option>
                      <option value="arrow">Pfeil</option>
                      <option value="dot">Punkt</option>
                      <option value="diamond">Raute</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500">Ende:</span>
                    <select
                      value={toolSettings.connectorEndArrow}
                      onChange={(e) => setToolSettings({ connectorEndArrow: e.target.value as 'none' | 'arrow' | 'dot' | 'diamond' })}
                      className="bg-zinc-800 text-white text-xs rounded px-2 py-1 border border-zinc-700"
                    >
                      <option value="none">Keine</option>
                      <option value="arrow">Pfeil</option>
                      <option value="dot">Punkt</option>
                      <option value="diamond">Raute</option>
                    </select>
                  </div>
                </div>
                
                {/* Color */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
                  <span className="text-xs text-zinc-400">Farbe:</span>
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-7 h-7 rounded border-2 border-zinc-600 hover:border-zinc-400 transition-colors"
                    style={{ backgroundColor: toolSettings.color }}
                  />
                  {showColorPicker && (
                    <div className="flex gap-1">
                      {standardColors.slice(0, 8).map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setToolSettings({ color })
                            setShowColorPicker(false)
                          }}
                          className={clsx(
                            'w-6 h-6 rounded border-2 transition-all',
                            toolSettings.color === color ? 'border-white' : 'border-transparent hover:border-zinc-400'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Laser Settings */}
            {currentTool === 'laser' && (
              <div className="flex items-center gap-3">
                <Target size={16} className="text-red-500" />
                <span className="text-xs text-zinc-400">
                  Bewege die Maus um den Laser-Pointer zu zeigen
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Toolbar */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex items-center bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl max-w-[95vw] overflow-hidden"
      >
        {/* Zuklapp-Button links */}
        <motion.button
          onClick={() => {
            setIsToolbarVisible(false)
            setIsExpanded(false)
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-8 h-full min-w-[32px] flex-shrink-0 rounded-l-2xl flex items-center justify-center border-r border-zinc-700/50 text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-colors"
          title="Toolbar einklappen"
        >
          <ChevronDown size={16} />
        </motion.button>
        
        {/* Left Section: Quick Actions - hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-2 border-r border-zinc-700/50 flex-shrink-0">
          {/* Undo */}
          <motion.button
            onClick={undo}
            disabled={!canUndo()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              canUndo() 
                ? 'text-zinc-400 hover:bg-zinc-700 hover:text-white' 
                : 'text-zinc-600 cursor-not-allowed'
            )}
            title="Rückgängig (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </motion.button>
          
          {/* Redo */}
          <motion.button
            onClick={redo}
            disabled={!canRedo()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              canRedo() 
                ? 'text-zinc-400 hover:bg-zinc-700 hover:text-white' 
                : 'text-zinc-600 cursor-not-allowed'
            )}
            title="Wiederholen (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </motion.button>
        </div>

        {/* Center Section: Tools - horizontally scrollable on mobile */}
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-hide touch-pan-x"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {TOOL_HOTBAR.map((tool, index) => {
            const isActive = currentTool === tool
            const hotbarNumber = index + 1
            const toolInfo = getToolInfo(tool)

            return (
              <motion.button
                key={tool}
                onClick={() => handleToolClick(tool)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={clsx(
                  'relative flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex-shrink-0',
                  'transition-all duration-150 group',
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-white'
                )}
                title={`${toolInfo.name} (${toolInfo.shortcut})`}
              >
                {/* Hotbar Number Badge - hidden on mobile */}
                <span className={clsx(
                  'absolute -top-1 -left-1 w-4 h-4 text-[10px] font-bold rounded hidden sm:flex',
                  'items-center justify-center',
                  isActive 
                    ? 'bg-blue-400 text-blue-900' 
                    : 'bg-zinc-700 text-zinc-400 group-hover:bg-zinc-600'
                )}>
                  {hotbarNumber}
                </span>

                <ToolIcon tool={tool} size={18} />

                {/* Active + Expanded Indicator */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -bottom-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full"
                    />
                  )}
                </AnimatePresence>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 px-2 py-1 
                  bg-zinc-800 text-white text-xs rounded-lg
                  opacity-0 group-hover:opacity-100 transition-opacity
                  pointer-events-none whitespace-nowrap shadow-lg">
                  {toolInfo.name}
                  <span className="ml-1.5 text-zinc-400">{toolInfo.shortcut}</span>
                </div>
              </motion.button>
            )
          })}

          {/* Separator */}
          <div className="w-px h-8 bg-zinc-700/50 mx-1" />

          {/* Quick Switch (0) */}
          <motion.button
            onClick={handleQuickSwitch}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex flex-col items-center justify-center w-11 h-11 rounded-xl
              bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-white
              transition-all duration-150 group"
            title={`Letztes Tool: ${getToolInfo(lastUsedTool).name} (0)`}
          >
            <span className="absolute -top-1 -left-1 w-4 h-4 text-[10px] font-bold rounded
              flex items-center justify-center bg-zinc-700 text-zinc-400 group-hover:bg-zinc-600">
              0
            </span>
            <div className="relative">
              <RotateCcw size={12} className="absolute -top-0.5 -right-1.5 text-zinc-500" />
              <ToolIcon tool={lastUsedTool} size={16} />
            </div>
            <div className="absolute bottom-full mb-2 px-2 py-1 
              bg-zinc-800 text-white text-xs rounded-lg
              opacity-0 group-hover:opacity-100 transition-opacity
              pointer-events-none whitespace-nowrap shadow-lg">
              Quick-Switch
              <span className="ml-1.5 text-zinc-400">0</span>
            </div>
          </motion.button>
        </div>

        {/* Right Section: Zoom & Actions - kompakt auf mobile */}
        <div className="flex items-center gap-1 px-1 sm:px-2 py-2 border-l border-zinc-700/50 flex-shrink-0">
          {/* Zoom Out */}
          <motion.button
            onClick={() => handleZoom(0.8)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center
              text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
            title="Verkleinern"
          >
            <ZoomOut size={14} className="sm:w-4 sm:h-4" />
          </motion.button>
          
          {/* Zoom Display - hidden on very small screens */}
          <button
            onClick={() => setViewport({ scale: 1 })}
            className="hidden xs:block px-1 sm:px-2 py-1 text-[10px] sm:text-xs font-mono text-zinc-300 hover:text-white 
              hover:bg-zinc-700 rounded transition-colors min-w-[40px] sm:min-w-[50px] text-center"
            title="Zoom zurücksetzen"
          >
            {formatZoom()}
          </button>
          
          {/* Zoom In */}
          <motion.button
            onClick={() => handleZoom(1.25)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center
              text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
            title="Vergrößern"
          >
            <ZoomIn size={14} className="sm:w-4 sm:h-4" />
          </motion.button>

          {/* Additional actions - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1">
            <div className="w-px h-6 bg-zinc-700/50 mx-1" />

            {/* History */}
            <motion.button
              onClick={onHistoryClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
              title="Verlauf"
            >
              <History size={16} />
            </motion.button>

            {/* Media */}
            <motion.button
              onClick={onMediaClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
              title="Medien hinzufügen"
            >
              <Image size={16} />
            </motion.button>

            {/* Workspaces (Phase 4) */}
            {onWorkspaceClick && (
              <motion.button
                onClick={onWorkspaceClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                  text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                title="Arbeitsbereiche"
              >
                <MapPin size={16} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Expand Toggle */}
        {hasToolSettings && (
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={clsx(
              'w-8 h-full flex-shrink-0 rounded-r-2xl flex items-center justify-center border-l transition-colors',
              isExpanded
                ? 'bg-blue-600/20 text-blue-400 border-blue-600/30'
                : 'text-zinc-500 hover:text-white border-zinc-700/50 hover:bg-zinc-700/50'
            )}
            title={isExpanded ? 'Einklappen' : 'Einstellungen'}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </motion.button>
        )}
      </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UnifiedToolbar
