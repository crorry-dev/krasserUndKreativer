import { useCanvasStore, Tool } from '@/stores/canvasStore'
import { useUserSettingsStore, ToolConfig } from '@/stores/userSettingsStore'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import {
  SelectIcon,
  PenIcon,
  ShapeIcon,
  TextIcon,
  StickyNoteIcon,
  HandIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EraserIcon,
} from '@/components/Icons'
import { Cable, Pointer } from 'lucide-react'

// Tool-zu-Icon Mapping
const toolIcons: Record<Tool, React.ReactNode> = {
  select: <SelectIcon size={20} />,
  pen: <PenIcon size={20} />,
  eraser: <EraserIcon size={20} />,
  shape: <ShapeIcon size={20} />,
  text: <TextIcon size={20} />,
  sticky: <StickyNoteIcon size={20} />,
  pan: <HandIcon size={20} />,
  connector: <Cable size={20} />,
  laser: <Pointer size={20} />,
}

// Tool-zu-Label Mapping
const toolLabels: Record<Tool, string> = {
  select: 'Auswählen',
  pen: 'Zeichnen',
  eraser: 'Radierer',
  shape: 'Form',
  text: 'Text',
  sticky: 'Notiz',
  pan: 'Bewegen',
  connector: 'Verbindung',
  laser: 'Laser-Pointer',
}

export function Toolbar() {
  const { currentTool, setTool, viewport, setViewport } = useCanvasStore()
  const { toolbarSettings } = useUserSettingsStore()
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Nur aktivierte Tools anzeigen
  const enabledTools = useMemo(() => 
    toolbarSettings.toolConfigs.filter(c => c.enabled),
    [toolbarSettings.toolConfigs]
  )
  
  const handleZoomIn = () => {
    const newScale = viewport.scale * 1.2
    setViewport({ scale: newScale })
  }
  
  const handleZoomOut = () => {
    const newScale = Math.max(0.0001, viewport.scale / 1.2)
    setViewport({ scale: newScale })
  }
  
  const handleReset = () => {
    setViewport({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 })
  }
  
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
      {/* Ausgeklappte Toolbar */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex items-center gap-1 p-2 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
          >
            {/* Tools aus Konfiguration */}
            {enabledTools.map((config: ToolConfig) => (
              <button
                key={config.tool}
                onClick={() => setTool(config.tool)}
                className={clsx(
                  'w-11 h-11 flex items-center justify-center rounded-xl transition-all relative group',
                  currentTool === config.tool
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
                title={`${toolLabels[config.tool]} (${config.shortcut})`}
              >
                {toolIcons[config.tool]}
                {/* Shortcut Badge */}
                {config.shortcut && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-white/20 rounded text-[10px] flex items-center justify-center text-white/60 group-hover:bg-white/30">
                    {config.shortcut}
                  </span>
                )}
              </button>
            ))}
            
            {enabledTools.length > 0 && (
              <div className="w-px h-8 bg-white/20 mx-2" />
            )}
            
            {/* Zoom controls */}
            <button
              onClick={handleZoomOut}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
              title="Verkleinern"
            >
              <ZoomOutIcon size={20} />
            </button>
            
            <button
              onClick={handleReset}
              className="px-3 h-11 flex items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white text-sm font-mono min-w-[60px]"
              title="Zurücksetzen"
            >
              {Math.round(viewport.scale * 100)}%
            </button>
            
            <button
              onClick={handleZoomIn}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
              title="Vergrößern"
            >
              <ZoomInIcon size={20} />
            </button>
            
            {/* Divider */}
            <div className="w-px h-8 bg-white/20 mx-2" />
            
            {/* Zuklapp-Button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
              title="Toolbar einklappen"
            >
              <ChevronDownIcon size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Aufklapp-Button (immer sichtbar wenn eingeklappt) */}
      {!isExpanded && (
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={() => setIsExpanded(true)}
          className="w-12 h-12 flex items-center justify-center bg-black/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl text-white/70 hover:bg-black/90 hover:text-white hover:scale-110 transition-all"
          title="Toolbar öffnen"
        >
          <ChevronUpIcon size={24} />
        </motion.button>
      )}
    </div>
  )
}
