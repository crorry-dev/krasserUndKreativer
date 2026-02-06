import { useEffect, useCallback, useRef } from 'react'
import { useCanvasStore } from '../stores/canvasStore'

const PAN_SPEED = 50 // Pixel pro Frame
const ZOOM_STEP = 0.1 // 10% pro Tastendruck
const MIN_SCALE = 0.0001

interface KeyState {
  ArrowUp: boolean
  ArrowDown: boolean
  ArrowLeft: boolean
  ArrowRight: boolean
}

/**
 * Hook für Tastaturnavigation auf dem Canvas
 * - Pfeiltasten: Navigieren
 * - +/- oder =/_: Zoom
 * 
 * WICHTIG: Navigation ist gesperrt wenn man einem Presenter folgt!
 */
export function useKeyboardNavigation() {
  const setViewport = useCanvasStore((s) => s.setViewport)
  const keysPressed = useRef<KeyState>({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  })
  const animationFrameRef = useRef<number | null>(null)
  const isAnimatingRef = useRef(false)

  // Kontinuierliche Navigation
  const updateNavigation = useCallback(() => {
    // WICHTIG: Keine Navigation wenn Follower-Modus aktiv
    const { presenterState } = useCanvasStore.getState()
    if (presenterState.isFollowing) {
      isAnimatingRef.current = false
      return
    }
    
    const keys = keysPressed.current
    const { viewport } = useCanvasStore.getState()
    
    let dx = 0
    let dy = 0
    
    // Pan-Speed anpassen basierend auf Zoom-Level
    const adjustedSpeed = PAN_SPEED / viewport.scale
    
    if (keys.ArrowUp) dy += adjustedSpeed
    if (keys.ArrowDown) dy -= adjustedSpeed
    if (keys.ArrowLeft) dx += adjustedSpeed
    if (keys.ArrowRight) dx -= adjustedSpeed
    
    if (dx !== 0 || dy !== 0) {
      setViewport({
        ...viewport,
        x: viewport.x + dx,
        y: viewport.y + dy,
      })
      animationFrameRef.current = requestAnimationFrame(updateNavigation)
    } else {
      isAnimatingRef.current = false
    }
  }, [setViewport])

  // Animation starten wenn nötig
  const startAnimation = useCallback(() => {
    if (!isAnimatingRef.current) {
      isAnimatingRef.current = true
      animationFrameRef.current = requestAnimationFrame(updateNavigation)
    }
  }, [updateNavigation])

  // Zoom Handler
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    // WICHTIG: Kein Zoom wenn Follower-Modus aktiv
    const { presenterState, viewport } = useCanvasStore.getState()
    if (presenterState.isFollowing) return
    
    const factor = direction === 'in' ? (1 + ZOOM_STEP) : (1 - ZOOM_STEP)
    const newScale = Math.max(MIN_SCALE, viewport.scale * factor)
    
    // Zoom zentriert auf Bildschirmmitte
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    
    // Berechne Canvas-Position unter Cursor
    const canvasX = (centerX - viewport.x) / viewport.scale
    const canvasY = (centerY - viewport.y) / viewport.scale
    
    // Neue Position so dass gleicher Punkt unter Cursor bleibt
    const newX = centerX - canvasX * newScale
    const newY = centerY - canvasY * newScale
    
    setViewport({
      x: newX,
      y: newY,
      scale: newScale,
    })
  }, [setViewport])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Nicht reagieren wenn in Input-Feld
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return
      }
      
      // WICHTIG: Keine Navigation wenn Follower-Modus aktiv
      const { presenterState } = useCanvasStore.getState()
      if (presenterState.isFollowing) {
        return
      }

      // Pfeiltasten
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
          e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        keysPressed.current[e.key as keyof KeyState] = true
        startAnimation()
      }

      // Zoom: + oder = (gleiche Taste auf US-Layout)
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        handleZoom('in')
      }

      // Zoom: - oder _
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        handleZoom('out')
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
          e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keysPressed.current[e.key as keyof KeyState] = false
      }
    }

    // Blur-Event: Alle Tasten zurücksetzen wenn Fenster Fokus verliert
    const handleBlur = () => {
      keysPressed.current = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [startAnimation, handleZoom])

  return {
    zoomIn: () => handleZoom('in'),
    zoomOut: () => handleZoom('out'),
  }
}
