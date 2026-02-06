import { useEffect, useCallback, useState } from 'react'
import { Circle, Line, Group } from 'react-konva'
import { useCanvasStore } from '../../stores/canvasStore'
import { motion, AnimatePresence } from 'framer-motion'

interface LaserPointerProps {
  scale: number
}

// Verfügbare Laserfarben
const LASER_COLORS = [
  { name: 'Rot', value: '#EF4444' },
  { name: 'Grün', value: '#22C55E' },
  { name: 'Blau', value: '#3B82F6' },
  { name: 'Gelb', value: '#EAB308' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
]

// Lasergrößen
const LASER_SIZES = [
  { name: 'XS', value: 1 },
  { name: 'S', value: 2 },
  { name: 'M', value: 3 },
  { name: 'L', value: 4 },
  { name: 'XL', value: 5 },
]

/**
 * Laserpointer Tool - Zeigt einen farbigen Punkt mit Trail
 * Nur aktiv wenn 'laser' Tool ausgewählt ist UND Maus gedrückt wird
 */
export function LaserPointer({ scale }: LaserPointerProps) {
  const currentTool = useCanvasStore((state) => state.currentTool)
  const laserState = useCanvasStore((state) => state.laserState)
  const setLaserState = useCanvasStore((state) => state.setLaserState)
  const clearLaserTrail = useCanvasStore((state) => state.clearLaserTrail)

  // Aktiviere/Deaktiviere Laser basierend auf Tool
  useEffect(() => {
    if (currentTool === 'laser') {
      setLaserState({ isActive: true })
    } else {
      clearLaserTrail()
    }
  }, [currentTool, setLaserState, clearLaserTrail])

  // Nur anzeigen wenn Laser aktiv UND Maus gedrückt
  if (!laserState.isActive || currentTool !== 'laser' || !laserState.isPressed) {
    return null
  }

  // Größe des Laserpunkts (skaliert mit Zoom und Einstellung)
  const sizeMultiplier = laserState.size * 4
  const dotSize = sizeMultiplier / scale
  const trailWidth = (laserState.size * 1.5) / scale
  const color = laserState.color

  return (
    <Group>
      {/* Trail - Linie durch alle Trail-Punkte */}
      {laserState.trail.length > 1 && (
        <Line
          points={laserState.trail.flatMap(p => [p.x, p.y])}
          stroke={color}
          strokeWidth={trailWidth}
          lineCap="round"
          lineJoin="round"
          opacity={0.6}
          tension={0.5}
        />
      )}

      {/* Hauptpunkt */}
      <Group x={laserState.x} y={laserState.y}>
        {/* Äußerer Glow */}
        <Circle
          radius={dotSize * 2}
          fill="transparent"
          stroke={color}
          strokeWidth={2 / scale}
          opacity={0.3}
        />
        
        {/* Mittlerer Ring */}
        <Circle
          radius={dotSize * 1.2}
          fill={color}
          opacity={0.4}
          shadowColor={color}
          shadowBlur={20 / scale}
          shadowOpacity={0.8}
        />
        
        {/* Kernpunkt */}
        <Circle
          radius={dotSize * 0.6}
          fill={color}
          shadowColor={color}
          shadowBlur={10 / scale}
          shadowOpacity={1}
        />
        
        {/* Weißer Kern */}
        <Circle
          radius={dotSize * 0.3}
          fill="white"
          opacity={0.9}
        />
      </Group>
    </Group>
  )
}

/**
 * Laser Einstellungs-Menü (React DOM, nicht Konva)
 */
export function LaserSettingsMenu() {
  const currentTool = useCanvasStore((state) => state.currentTool)
  const laserState = useCanvasStore((state) => state.laserState)
  const setLaserState = useCanvasStore((state) => state.setLaserState)
  const [isOpen, setIsOpen] = useState(false)

  if (currentTool !== 'laser') {
    return null
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-800/90 backdrop-blur-md rounded-full border border-gray-700 text-white text-sm font-medium hover:bg-gray-700 transition-colors shadow-lg flex items-center gap-2"
      >
        <span 
          className="w-4 h-4 rounded-full" 
          style={{ backgroundColor: laserState.color }}
        />
        <span>Laser Einstellungen</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Settings Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800/95 backdrop-blur-md rounded-xl border border-gray-700 p-4 shadow-xl min-w-[200px]"
          >
            {/* Farben */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
                Farbe
              </label>
              <div className="flex gap-2 flex-wrap">
                {LASER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setLaserState({ color: c.value })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      laserState.color === c.value 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Größe */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
                Größe
              </label>
              <div className="flex gap-1">
                {LASER_SIZES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setLaserState({ size: s.value })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-all ${
                      laserState.size === s.value
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Hinweis */}
            <p className="mt-3 text-xs text-gray-500 text-center">
              Klicken & halten zum Zeigen
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Hook für Laser-Koordinaten-Transformation
 * Wird im InfiniteCanvas verwendet um Screen → Canvas Koordinaten zu konvertieren
 */
export function useLaserPointer() {
  const currentTool = useCanvasStore((state) => state.currentTool)
  const addLaserTrailPoint = useCanvasStore((state) => state.addLaserTrailPoint)
  const clearLaserTrail = useCanvasStore((state) => state.clearLaserTrail)
  const setLaserState = useCanvasStore((state) => state.setLaserState)

  const updateLaserPosition = useCallback((canvasX: number, canvasY: number) => {
    if (currentTool !== 'laser') return
    setLaserState({ x: canvasX, y: canvasY })
    addLaserTrailPoint(canvasX, canvasY)
  }, [currentTool, setLaserState, addLaserTrailPoint])

  const startLaser = useCallback(() => {
    if (currentTool !== 'laser') return
    setLaserState({ isPressed: true, trail: [] })
  }, [currentTool, setLaserState])

  const stopLaser = useCallback(() => {
    setLaserState({ isPressed: false })
    // Trail nach kurzer Verzögerung clearen für fade-out Effekt
    setTimeout(() => {
      clearLaserTrail()
    }, 300)
  }, [setLaserState, clearLaserTrail])

  return {
    isLaserActive: currentTool === 'laser',
    updateLaserPosition,
    startLaser,
    stopLaser,
  }
}

export default LaserPointer
