import { useCanvasStore, Tool } from '@/stores/canvasStore'
import { motion } from 'framer-motion'
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
} from '@/components/Icons'

const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <SelectIcon size={20} />, label: 'Auswählen' },
  { id: 'pen', icon: <PenIcon size={20} />, label: 'Zeichnen' },
  { id: 'shape', icon: <ShapeIcon size={20} />, label: 'Form' },
  { id: 'text', icon: <TextIcon size={20} />, label: 'Text' },
  { id: 'sticky', icon: <StickyNoteIcon size={20} />, label: 'Notiz' },
  { id: 'pan', icon: <HandIcon size={20} />, label: 'Bewegen' },
]

export function Toolbar() {
  const { currentTool, setTool, viewport, setViewport } = useCanvasStore()
  
  const handleZoomIn = () => {
    // Kein Maximum - unendlich reinzoomen
    const newScale = viewport.scale * 1.2
    setViewport({ scale: newScale })
  }
  
  const handleZoomOut = () => {
    // Minimum sehr klein für weites Rauszoomen
    const newScale = Math.max(0.0001, viewport.scale / 1.2)
    setViewport({ scale: newScale })
  }
  
  const handleReset = () => {
    setViewport({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 })
  }
  
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-2 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
    >
      {/* Tools */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setTool(tool.id)}
          className={clsx(
            'w-11 h-11 flex items-center justify-center rounded-xl transition-all',
            currentTool === tool.id
              ? 'bg-white text-black'
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          )}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
      
      {/* Divider */}
      <div className="w-px h-8 bg-white/20 mx-2" />
      
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
    </motion.div>
  )
}
