import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCanvasStore, WorkspaceRegion } from '../../stores/canvasStore'
import {
  Map,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Navigation,
  MapPin,
  Crosshair,
} from 'lucide-react'

interface MinimapProps {
  className?: string
  width?: number
  height?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  isConnected?: boolean
  onlineCount?: number
}

/**
 * Kompakte Minimap mit Viewport-Indikator und Koordinaten
 * Position: oben links (Standard)
 */
export function Minimap({ 
  className = '', 
  width = 160, 
  height = 100,
  position = 'top-left',
  isConnected = false,
  onlineCount = 1
}: MinimapProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showWaypoints, setShowWaypoints] = useState(false)
  const [newWaypointName, setNewWaypointName] = useState('')
  
  const viewport = useCanvasStore((state) => state.viewport)
  const setViewport = useCanvasStore((state) => state.setViewport)
  const objects = useCanvasStore((state) => state.objects)
  const waypoints = useCanvasStore((state) => state.waypoints)
  const workspaceRegions = useCanvasStore((state) => state.workspaceRegions)
  const addWaypoint = useCanvasStore((state) => state.addWaypoint)
  const removeWaypoint = useCanvasStore((state) => state.removeWaypoint)
  const navigateToWaypoint = useCanvasStore((state) => state.navigateToWaypoint)

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-right': 'bottom-20 right-4',
  }

  // Berechne Bounding Box aller Objekte
  const bounds = useMemo(() => {
    const objectArray = Array.from(objects.values())
    if (objectArray.length === 0) {
      return { minX: -500, minY: -500, maxX: 500, maxY: 500 }
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    objectArray.forEach((obj) => {
      minX = Math.min(minX, obj.x)
      minY = Math.min(minY, obj.y)
      maxX = Math.max(maxX, obj.x + obj.width)
      maxY = Math.max(maxY, obj.y + obj.height)
    })

    // Padding
    const padding = 100
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    }
  }, [objects])

  // Skalierung für Minimap
  const mapScale = useMemo(() => {
    const contentWidth = bounds.maxX - bounds.minX
    const contentHeight = bounds.maxY - bounds.minY
    return Math.min(width / contentWidth, height / contentHeight)
  }, [bounds, width, height])

  // Transformiere Weltkoordinaten zu Minimap-Koordinaten
  const worldToMap = useCallback((x: number, y: number) => ({
    x: (x - bounds.minX) * mapScale,
    y: (y - bounds.minY) * mapScale,
  }), [bounds, mapScale])

  // Viewport-Rechteck in Minimap
  const viewportRect = useMemo(() => {
    const canvasWidth = window.innerWidth
    const canvasHeight = window.innerHeight
    
    const topLeft = worldToMap(
      -viewport.x / viewport.scale,
      -viewport.y / viewport.scale
    )
    
    const viewWidth = (canvasWidth / viewport.scale) * mapScale
    const viewHeight = (canvasHeight / viewport.scale) * mapScale
    
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: Math.max(20, viewWidth),
      height: Math.max(15, viewHeight),
    }
  }, [viewport, worldToMap, mapScale])

  // Aktuelle Weltkoordinaten
  const currentCoords = useMemo(() => ({
    x: Math.round(-viewport.x / viewport.scale + window.innerWidth / 2 / viewport.scale),
    y: Math.round(-viewport.y / viewport.scale + window.innerHeight / 2 / viewport.scale),
  }), [viewport])

  // Zoom-Level formatieren
  const formatZoom = useMemo(() => {
    const scale = viewport.scale
    if (scale >= 1000) return `${(scale / 1000).toFixed(0)}k%`
    if (scale >= 10) return `${Math.round(scale * 100)}%`
    return `${(scale * 100).toFixed(0)}%`
  }, [viewport.scale])

  // Klick auf Minimap → Navigation
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    
    const worldX = clickX / mapScale + bounds.minX
    const worldY = clickY / mapScale + bounds.minY
    
    const canvasWidth = window.innerWidth
    const canvasHeight = window.innerHeight
    
    setViewport({
      x: -(worldX * viewport.scale - canvasWidth / 2),
      y: -(worldY * viewport.scale - canvasHeight / 2),
    })
  }

  // Workspace-Region Location Points
  const navigateToRegion = useCallback((region: WorkspaceRegion) => {
    const centerX = (region.bounds.x1 + region.bounds.x2) / 2
    const centerY = (region.bounds.y1 + region.bounds.y2) / 2
    const canvasWidth = window.innerWidth
    const canvasHeight = window.innerHeight
    setViewport({
      x: -(centerX * viewport.scale - canvasWidth / 2),
      y: -(centerY * viewport.scale - canvasHeight / 2),
    })
  }, [setViewport, viewport.scale])

  // Zur Mitte navigieren
  const handleCenterClick = () => {
    setViewport({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      scale: 1,
    })
  }

  // Waypoint hinzufügen
  const handleAddWaypoint = () => {
    if (newWaypointName.trim()) {
      addWaypoint(newWaypointName.trim())
      setNewWaypointName('')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed ${positionClasses[position]} z-40 ${className}`}
    >
      <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-xl overflow-hidden">
        {/* Compact Header with Coords */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 
                     hover:bg-zinc-800/50 transition-colors text-xs"
        >
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Map size={12} />
            <span className="font-mono text-zinc-300">
              {currentCoords.x}, {currentCoords.y}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-zinc-500 font-mono">{onlineCount}</span>
            </div>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500 font-mono">{formatZoom}</span>
            {isExpanded ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              {/* Minimap Canvas */}
              <div
                onClick={handleMinimapClick}
                className="relative bg-zinc-950 cursor-crosshair mx-1.5 mb-1.5 rounded overflow-hidden"
                style={{ width, height }}
              >
                {/* Objekte als Punkte */}
                {Array.from(objects.values()).map((obj) => {
                  const pos = worldToMap(obj.x, obj.y)
                  const objWidth = Math.max(3, obj.width * mapScale)
                  const objHeight = Math.max(3, obj.height * mapScale)
                  
                  const colors: Record<string, string> = {
                    stroke: '#3B82F6',
                    shape: '#8B5CF6',
                    text: '#10B981',
                    sticky: '#F59E0B',
                    image: '#EC4899',
                    video: '#EF4444',
                    audio: '#06B6D4',
                    connector: '#6366F1',
                  }
                  
                  return (
                    <div
                      key={obj.id}
                      className="absolute rounded-sm"
                      style={{
                        left: pos.x,
                        top: pos.y,
                        width: objWidth,
                        height: objHeight,
                        backgroundColor: colors[obj.type] || '#666',
                        opacity: 0.8,
                      }}
                    />
                  )
                })}

                {/* Waypoints */}
                {waypoints.map((wp) => {
                  const pos = worldToMap(
                    -wp.x / wp.scale + window.innerWidth / 2 / wp.scale,
                    -wp.y / wp.scale + window.innerHeight / 2 / wp.scale
                  )
                  
                  return (
                    <div
                      key={wp.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigateToWaypoint(wp.id)
                      }}
                      className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2
                                 bg-yellow-500 rounded-full border border-white
                                 cursor-pointer hover:scale-125 transition-transform"
                      style={{ left: pos.x, top: pos.y }}
                      title={wp.name}
                    />
                  )
                })}

                {/* Workspace Regions as Location Points */}
                {workspaceRegions.length > 0 && workspaceRegions
                  .filter((region) => region?.bounds)
                  .map((region) => {
                  const centerX = (region.bounds.x1 + region.bounds.x2) / 2
                  const centerY = (region.bounds.y1 + region.bounds.y2) / 2
                  const pos = worldToMap(centerX, centerY)

                  return (
                    <div
                      key={`region-point-${region.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigateToRegion(region)
                      }}
                      className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 cursor-pointer hover:scale-125 transition-transform"
                      style={{
                        left: pos.x,
                        top: pos.y,
                        backgroundColor: region.color,
                      }}
                      title={region.name}
                    />
                  )
                })}

                {/* Viewport Indicator */}
                <div
                  className="absolute border border-blue-400 bg-blue-500/20 
                             pointer-events-none rounded-sm"
                  style={{
                    left: viewportRect.x,
                    top: viewportRect.y,
                    width: viewportRect.width,
                    height: viewportRect.height,
                  }}
                />

                {/* Center crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                               w-2 h-2 border border-zinc-600 rounded-full opacity-50" />
              </div>

              {/* Quick Actions Row */}
              <div className="flex items-center justify-between px-1.5 pb-1.5 gap-1">
                <button
                  onClick={handleCenterClick}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-zinc-400 
                             hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
                  title="Zur Mitte (0,0)"
                >
                  <Crosshair size={10} />
                  <span>Center</span>
                </button>
                
                <button
                  onClick={() => setShowWaypoints(!showWaypoints)}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-zinc-400 
                             hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
                >
                  <MapPin size={10} />
                  <span>{waypoints.length}</span>
                  {showWaypoints ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              </div>

              {/* Waypoints Panel */}
              <AnimatePresence>
                {showWaypoints && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-zinc-700/50 px-1.5 py-1.5 overflow-hidden"
                  >
                    {/* Add Waypoint */}
                    <div className="flex gap-1 mb-1.5">
                      <input
                        type="text"
                        value={newWaypointName}
                        onChange={(e) => setNewWaypointName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddWaypoint()}
                        placeholder="Wegpunkt..."
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5
                                   text-[10px] text-white placeholder:text-zinc-500
                                   focus:outline-none focus:border-blue-500 min-w-0"
                      />
                      <button
                        onClick={handleAddWaypoint}
                        disabled={!newWaypointName.trim()}
                        className="p-0.5 bg-blue-600 rounded hover:bg-blue-500 
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Waypoint List */}
                    <div className="max-h-20 overflow-y-auto space-y-0.5">
                      {waypoints.length === 0 ? (
                        <p className="text-[10px] text-zinc-500 text-center py-1">
                          Keine Wegpunkte
                        </p>
                      ) : (
                        waypoints.map((wp) => (
                          <div
                            key={wp.id}
                            className="flex items-center justify-between gap-1 px-1 py-0.5
                                       bg-zinc-800/50 rounded hover:bg-zinc-800 group"
                          >
                            <button
                              onClick={() => navigateToWaypoint(wp.id)}
                              className="flex items-center gap-1 text-[10px] text-zinc-300 
                                         hover:text-white flex-1 text-left truncate"
                            >
                              <Navigation size={10} />
                              <span className="truncate">{wp.name}</span>
                            </button>
                            <button
                              onClick={() => removeWaypoint(wp.id)}
                              className="p-0.5 text-zinc-500 hover:text-red-400 
                                         opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default Minimap
