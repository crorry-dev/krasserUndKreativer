import { motion, AnimatePresence } from 'framer-motion'
import { useCanvasStore, TOOL_HOTBAR, Tool } from '../../stores/canvasStore'
import { getToolInfo } from '../../hooks/useToolHotbar'
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
} from 'lucide-react'

interface ToolHotbarProps {
  className?: string
}

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
 * Videospiel-artige Tool-Hotbar
 * Zeigt alle Tools mit Nummern 1-9 an, 0 für Quick-Switch
 */
export function ToolHotbar({ className = '' }: ToolHotbarProps) {
  const currentTool = useCanvasStore((state) => state.currentTool)
  const lastUsedTool = useCanvasStore((state) => state.lastUsedTool)
  const setTool = useCanvasStore((state) => state.setTool)
  const setLastUsedTool = useCanvasStore((state) => state.setLastUsedTool)

  const handleToolClick = (tool: Tool) => {
    if (currentTool !== tool) {
      setLastUsedTool(currentTool)
      setTool(tool)
    }
  }

  const handleQuickSwitch = () => {
    if (lastUsedTool !== currentTool) {
      const temp = currentTool
      setTool(lastUsedTool)
      setLastUsedTool(temp)
    }
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${className}`}
    >
      <div className="flex items-center gap-1 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-2 shadow-2xl">
        {/* Tool Slots 1-9 */}
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
              className={`
                relative flex flex-col items-center justify-center w-12 h-12 rounded-xl
                transition-all duration-150 group
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-white'
                }
              `}
              title={`${toolInfo.name} (${toolInfo.shortcut})`}
            >
              {/* Hotbar Number Badge */}
              <span className={`
                absolute -top-1 -left-1 w-4 h-4 text-[10px] font-bold rounded
                flex items-center justify-center
                ${isActive 
                  ? 'bg-blue-400 text-blue-900' 
                  : 'bg-zinc-700 text-zinc-400 group-hover:bg-zinc-600'
                }
              `}>
                {hotbarNumber}
              </span>

              {/* Tool Icon */}
              <ToolIcon tool={tool} size={18} />

              {/* Active Indicator */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -bottom-1 w-1.5 h-1.5 bg-blue-400 rounded-full"
                  />
                )}
              </AnimatePresence>

              {/* Tooltip on Hover */}
              <div className="
                absolute bottom-full mb-2 px-2 py-1 
                bg-zinc-800 text-white text-xs rounded-lg
                opacity-0 group-hover:opacity-100 transition-opacity
                pointer-events-none whitespace-nowrap
                shadow-lg
              ">
                {toolInfo.name}
                <span className="ml-1.5 text-zinc-400">{toolInfo.shortcut}</span>
              </div>
            </motion.button>
          )
        })}

        {/* Separator */}
        <div className="w-px h-8 bg-zinc-700/50 mx-1" />

        {/* Quick Switch Button (0) */}
        <motion.button
          onClick={handleQuickSwitch}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            relative flex flex-col items-center justify-center w-12 h-12 rounded-xl
            bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-white
            transition-all duration-150 group
          `}
          title={`Letztes Tool: ${getToolInfo(lastUsedTool).name} (0)`}
        >
          {/* 0 Badge */}
          <span className="
            absolute -top-1 -left-1 w-4 h-4 text-[10px] font-bold rounded
            flex items-center justify-center
            bg-zinc-700 text-zinc-400 group-hover:bg-zinc-600
          ">
            0
          </span>

          {/* Rotate/Switch Icon with last tool preview */}
          <div className="relative">
            <RotateCcw size={14} className="absolute -top-1 -right-1 text-zinc-500" />
            <ToolIcon tool={lastUsedTool} size={16} />
          </div>

          {/* Tooltip */}
          <div className="
            absolute bottom-full mb-2 px-2 py-1 
            bg-zinc-800 text-white text-xs rounded-lg
            opacity-0 group-hover:opacity-100 transition-opacity
            pointer-events-none whitespace-nowrap
            shadow-lg
          ">
            Quick-Switch
            <span className="ml-1.5 text-zinc-400">0</span>
          </div>
        </motion.button>
      </div>
    </motion.div>
  )
}

export default ToolHotbar
