import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { Stage, Layer, Line, Circle, Rect, Text, Arrow, RegularPolygon, Image as KonvaImage, Group } from 'react-konva'
import { useGesture } from '@use-gesture/react'
import Konva from 'konva'
import { useCanvasStore, CanvasObject, ShapeType, AnchorPosition, ConnectorAnchor } from '@/stores/canvasStore'
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation'
import { MediaOverlay } from '@/components/Media/MediaOverlay'

const MIN_SCALE = 0.0001 // Extrem weit rauszoomen möglich (0.01% = sieht gesamtes Universum)
// MAX_SCALE entfernt - unendliches Reinzoomen möglich (bis auf Atomebene und darüber hinaus)

// Hook to load images for Konva
function useImage(src: string): [HTMLImageElement | undefined, 'loading' | 'loaded' | 'error'] {
  const [image, setImage] = useState<HTMLImageElement | undefined>()
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  
  useEffect(() => {
    if (!src) return
    
    setStatus('loading')
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      setImage(img)
      setStatus('loaded')
    }
    
    img.onerror = () => {
      setStatus('error')
    }
    
    img.src = src
    
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src])
  
  return [image, status]
}

// Component to render an image on canvas
function CanvasImage({ obj, isSelected, viewport, onSelect, onUpdate }: {
  obj: CanvasObject
  isSelected: boolean
  viewport: { scale: number }
  onSelect: () => void
  onUpdate: (changes: Partial<CanvasObject>) => void
}) {
  const { src } = obj.data as { src: string }
  const [image, status] = useImage(src)
  
  if (status === 'loading') {
    // Loading placeholder
    return (
      <Group>
        <Rect
          x={obj.x}
          y={obj.y}
          width={obj.width}
          height={obj.height}
          fill="#1F2937"
          cornerRadius={8}
          stroke={isSelected ? '#3b82f6' : '#374151'}
          strokeWidth={isSelected ? 3 / viewport.scale : 1 / viewport.scale}
        />
        <Text
          x={obj.x}
          y={obj.y + obj.height / 2 - 10}
          width={obj.width}
          text="⏳ Laden..."
          fontSize={14}
          fill="#9CA3AF"
          align="center"
        />
      </Group>
    )
  }
  
  if (status === 'error') {
    return (
      <Group>
        <Rect
          x={obj.x}
          y={obj.y}
          width={obj.width}
          height={obj.height}
          fill="#1F2937"
          cornerRadius={8}
          stroke="#EF4444"
          strokeWidth={2 / viewport.scale}
        />
        <Text
          x={obj.x}
          y={obj.y + obj.height / 2 - 10}
          width={obj.width}
          text="❌ Fehler beim Laden"
          fontSize={14}
          fill="#EF4444"
          align="center"
        />
      </Group>
    )
  }
  
  return (
    <Group>
      <KonvaImage
        x={obj.x}
        width={obj.width}
        height={obj.height}
        image={image}
        cornerRadius={4}
        onClick={onSelect}
        onTap={onSelect}
      />
      {/* Selection border */}
      {isSelected && (
        <>
          <Rect
            x={obj.x - 2}
            y={obj.y - 2}
            width={obj.width + 4}
            height={obj.height + 4}
            stroke="#3b82f6"
            strokeWidth={3 / viewport.scale}
            cornerRadius={6}
            listening={false}
          />
          {/* Resize handle bottom-right */}
          <Rect
            x={obj.x + obj.width - 12 / viewport.scale}
            y={obj.y + obj.height - 12 / viewport.scale}
            width={12 / viewport.scale}
            height={12 / viewport.scale}
            fill="#3b82f6"
            cornerRadius={2}
            draggable
            onDragMove={(e) => {
              const newWidth = Math.max(50, e.target.x() + 12 / viewport.scale - obj.x)
              const newHeight = Math.max(50, e.target.y() + 12 / viewport.scale - obj.y)
              e.target.x(obj.x + newWidth - 12 / viewport.scale)
              e.target.y(obj.y + newHeight - 12 / viewport.scale)
            }}
            onDragEnd={(e) => {
              const newWidth = Math.max(50, e.target.x() + 12 / viewport.scale - obj.x)
              const newHeight = Math.max(50, e.target.y() + 12 / viewport.scale - obj.y)
              onUpdate({ width: newWidth, height: newHeight })
            }}
          />
        </>
      )}
    </Group>
  )
}

interface InfiniteCanvasProps {
  onCursorMove?: (x: number, y: number) => void
  onObjectCreate?: (object: CanvasObject) => void
  onObjectUpdate?: (objectId: string, changes: Record<string, unknown>) => void
}

// Shape drawing state
interface ShapeDrawState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  shapeType: ShapeType
}

// Drag state for moving objects
// Drag state for moving objects
interface DragState {
  objectId: string
  startCanvasPos: { x: number; y: number }
  objectStartPos: { x: number; y: number }
  // For multi-select drag: store all original positions
  multiDragStartPositions?: Map<string, { x: number; y: number }>
}

// Text edit state
interface TextEditState {
  objectId: string
  screenX: number
  screenY: number
  visible: boolean
}

// Connector creation state
interface ConnectorDrawState {
  sourceObjectId: string
  sourcePosition: AnchorPosition
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export function InfiniteCanvas({ onCursorMove, onObjectCreate, onObjectUpdate }: InfiniteCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastCursorUpdate = useRef(0)
  const [eraserPosition, setEraserPosition] = useState<{ x: number; y: number } | null>(null)
  const [penPosition, setPenPosition] = useState<{ x: number; y: number } | null>(null)
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })
  const textInputRef = useRef<HTMLTextAreaElement>(null)
  const [shapeDrawing, setShapeDrawing] = useState<ShapeDrawState | null>(null)
  
  // Drag state for moving objects with select tool
  const [dragState, setDragState] = useState<DragState | null>(null)
  
  // Text editing state for double-click edit
  const [textEditState, setTextEditState] = useState<TextEditState | null>(null)
  const textEditRef = useRef<HTMLTextAreaElement>(null)
  const lastClickTime = useRef<number>(0)
  const lastClickedObject = useRef<string | null>(null)
  
  // Selection box state for multi-select
  const [selectionBox, setSelectionBox] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)

  // Workspace draw state (drag to define bounds)
  const [workspaceDrawBox, setWorkspaceDrawBox] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  // Connector drawing state
  const [connectorDrawing, setConnectorDrawing] = useState<ConnectorDrawState | null>(null)
  
  // Mobile 2-finger tap state (simulates right-click)
  const twoFingerTapRef = useRef<{ timeout: ReturnType<typeof setTimeout> | null; touches: number }>({ timeout: null, touches: 0 })
  const [showMobileContextMenu, setShowMobileContextMenu] = useState<{ x: number; y: number } | null>(null)
  
  const {
    viewport,
    setViewport,
    currentTool,
    objects,
    isDrawing,
    setIsDrawing,
    currentStroke,
    addStrokePoint,
    clearStroke,
    addObject,
    updateObject,
    eraseAtPoint,
    toolSettings,
    selectedIds,
    setSelectedIds,
    toggleSelection,
    createConnector,
    updateConnectorPaths,
    workspaceRegions,
    // Laser state from store
    laserState,
    setLaserState,
    addLaserTrailPoint,
    clearLaserTrail,
    // Presenter state für Follower-Sperre
    presenterState,
    workspaceDrawMode,
    setWorkspaceDrawMode,
  } = useCanvasStore()
  
  // Prüfe ob Follower-Modus aktiv - dann ist eigene Navigation gesperrt
  const isFollowingPresenter = presenterState.isFollowing
  
  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (stageRef.current && containerRef.current) {
        stageRef.current.width(containerRef.current.clientWidth)
        stageRef.current.height(containerRef.current.clientHeight)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Keyboard navigation (Pfeiltasten + Zoom)
  useKeyboardNavigation()

  // Cancel workspace draw mode on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && workspaceDrawMode) {
        setWorkspaceDrawBox(null)
        setWorkspaceDrawMode(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [workspaceDrawMode, setWorkspaceDrawMode])
  
  // Expose stage for image export
  useEffect(() => {
    if (stageRef.current) {
      (window as unknown as { __konvaStage?: Konva.Stage }).__konvaStage = stageRef.current
    }
    return () => {
      delete (window as unknown as { __konvaStage?: Konva.Stage }).__konvaStage
    }
  }, [])
  
  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.x) / viewport.scale,
      y: (screenY - viewport.y) / viewport.scale,
    }
  }, [viewport])

  const pixelPattern = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.fillRect(0, 0, 4, 4)
      ctx.fillRect(4, 4, 4, 4)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.fillRect(4, 0, 4, 4)
      ctx.fillRect(0, 4, 4, 4)
    }
    const img = new window.Image()
    img.src = canvas.toDataURL('image/png')
    return img
  }, [])
  
  // Gesture handling for pan and zoom
  // WICHTIG: Im Follower-Modus ist Pan/Zoom komplett gesperrt!
  useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching, event }) => {
        // FOLLOWER-SPERRE: Keine eigene Navigation
        if (isFollowingPresenter) return
        
        if (pinching) return
        event?.preventDefault()
        
        if (currentTool === 'pan' || (event as PointerEvent)?.pointerType === 'touch' && (event as TouchEvent)?.touches?.length >= 2) {
          // Pan mode
          setViewport({
            x: viewport.x + dx,
            y: viewport.y + dy,
          })
        }
      },
      onPinch: ({ offset: [scale], origin: [ox, oy], event }) => {
        // FOLLOWER-SPERRE: Kein Pinch-Zoom
        if (isFollowingPresenter) return
        
        event?.preventDefault()
        
        // Kein Maximum - unendlich reinzoomen
        const newScale = Math.max(MIN_SCALE, scale)
        const scaleRatio = newScale / viewport.scale
        
        // Zoom towards pinch center
        setViewport({
          scale: newScale,
          x: ox - (ox - viewport.x) * scaleRatio,
          y: oy - (oy - viewport.y) * scaleRatio,
        })
      },
      onWheel: ({ delta: [, dy], event }) => {
        // FOLLOWER-SPERRE: Kein Scroll-Zoom
        if (isFollowingPresenter) {
          event.preventDefault()
          return
        }
        
        event.preventDefault()
        
        const stage = stageRef.current
        if (!stage) return
        
        const pointer = stage.getPointerPosition()
        if (!pointer) return
        
        const scaleBy = 1.1
        const oldScale = viewport.scale
        const newScale = dy > 0 
          ? Math.max(MIN_SCALE, oldScale / scaleBy)
          : oldScale * scaleBy // Kein Maximum - unendlich reinzoomen
        
        const scaleRatio = newScale / oldScale
        
        setViewport({
          scale: newScale,
          x: pointer.x - (pointer.x - viewport.x) * scaleRatio,
          y: pointer.y - (pointer.y - viewport.y) * scaleRatio,
        })
      },
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      drag: { filterTaps: true },
      pinch: { scaleBounds: { min: MIN_SCALE, max: 1000000 } }, // Praktisch unbegrenzt
    }
  )
  
  // Mobile 2-finger tap handler (simulates right-click for tool switching)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // 2 Finger berühren gleichzeitig
        e.preventDefault()
        twoFingerTapRef.current.touches = 2
        
        // Timeout für Tap-Erkennung (kurz berühren)
        twoFingerTapRef.current.timeout = setTimeout(() => {
          twoFingerTapRef.current.touches = 0
        }, 300)
        
        // Position zwischen beiden Fingern berechnen
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const centerX = (touch1.clientX + touch2.clientX) / 2
        const centerY = (touch1.clientY + touch2.clientY) / 2
        
        setShowMobileContextMenu({ x: centerX, y: centerY })
      }
    }
    
    const handleTouchEnd = (e: TouchEvent) => {
      // Wenn 2-Finger-Touch beendet wird bevor Timeout
      if (twoFingerTapRef.current.touches === 2 && e.touches.length < 2) {
        if (twoFingerTapRef.current.timeout) {
          clearTimeout(twoFingerTapRef.current.timeout)
        }
        twoFingerTapRef.current.touches = 0
      }
    }
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchend', handleTouchEnd)
      if (twoFingerTapRef.current.timeout) {
        clearTimeout(twoFingerTapRef.current.timeout)
      }
    }
  }, [])
  
  // State for right-click panning
  const [isRightClickPanning, setIsRightClickPanning] = useState(false)
  const [lastPanPos, setLastPanPos] = useState<{ x: number; y: number } | null>(null)
  
  // Drawing handlers
  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage()
    const pos = stage?.getPointerPosition()
    if (!pos) return
    
    const canvasPos = screenToCanvas(pos.x, pos.y)

    // Workspace-Draw-Modus: Box aktualisieren
    if (workspaceDrawMode && workspaceDrawBox) {
      setWorkspaceDrawBox({
        ...workspaceDrawBox,
        currentX: canvasPos.x,
        currentY: canvasPos.y,
      })
      return
    }
    
    // Rechtsklick = Pan (funktioniert mit jedem Tool)
    if (e.evt.button === 2) {
      e.evt.preventDefault()
      setIsRightClickPanning(true)
      setLastPanPos({ x: pos.x, y: pos.y })
      return
    }

    // Workspace-Draw-Modus: Bereich per Drag aufziehen
    if (workspaceDrawMode) {
      e.evt.preventDefault()
      setWorkspaceDrawBox({
        startX: canvasPos.x,
        startY: canvasPos.y,
        currentX: canvasPos.x,
        currentY: canvasPos.y,
      })
      return
    }
    
    if (currentTool === 'pen') {
      setIsDrawing(true)
      addStrokePoint(canvasPos)
    } else if (currentTool === 'eraser') {
      setIsDrawing(true)
      setEraserPosition(canvasPos)
      // Erase at position - splits strokes instead of deleting whole objects
      eraseAtPoint(canvasPos.x, canvasPos.y, toolSettings.eraserWidth / 2)
    } else if (currentTool === 'text') {
      // Show text input at position
      setTextInput({ x: pos.x, y: pos.y, visible: true })
      setTimeout(() => textInputRef.current?.focus(), 50)
    } else if (currentTool === 'sticky') {
      // Check if clicked on an existing sticky note
      const clickedObject = findObjectAtPosition(canvasPos)
      const now = Date.now()
      
      if (clickedObject && clickedObject.type === 'sticky') {
        // Check for double-click to edit text
        const isDoubleClick = 
          lastClickedObject.current === clickedObject.id && 
          now - lastClickTime.current < 300
        
        if (isDoubleClick) {
          // Open text editor for this sticky
          const screenX = clickedObject.x * viewport.scale + viewport.x
          const screenY = clickedObject.y * viewport.scale + viewport.y
          setTextEditState({
            objectId: clickedObject.id,
            screenX,
            screenY,
            visible: true,
          })
          setTimeout(() => {
            if (textEditRef.current) {
              textEditRef.current.focus()
              textEditRef.current.select()
            }
          }, 50)
          // Reset click tracking
          lastClickTime.current = 0
          lastClickedObject.current = null
          return
        }
        
        // Track for double-click detection and select the sticky
        lastClickTime.current = now
        lastClickedObject.current = clickedObject.id
        setSelectedIds(new Set([clickedObject.id]))
        return
      }
      
      // No sticky note clicked - create new one
      const id = `sticky-${Date.now()}`
      const newObject: CanvasObject = {
        id,
        type: 'sticky',
        x: canvasPos.x,
        y: canvasPos.y,
        width: 200,
        height: 150,
        data: { text: '', color: toolSettings.stickyColor },
        createdAt: Date.now(),
      }
      addObject(newObject)
      onObjectCreate?.(newObject)
      // Reset click tracking
      lastClickTime.current = 0
      lastClickedObject.current = null
    } else if (currentTool === 'shape') {
      // Start drawing shape - drag to set size
      setIsDrawing(true)
      setShapeDrawing({
        startX: canvasPos.x,
        startY: canvasPos.y,
        currentX: canvasPos.x,
        currentY: canvasPos.y,
        shapeType: toolSettings.shapeType,
      })
    } else if (currentTool === 'connector') {
      // Start connector from clicked object
      const clickedObject = findObjectAtPosition(canvasPos)
      if (clickedObject && clickedObject.type !== 'connector') {
        // Determine which anchor point is closest
        const anchorPosition = getClosestAnchor(clickedObject, canvasPos)
        const anchorPoint = getAnchorPoint(clickedObject, anchorPosition)
        
        setConnectorDrawing({
          sourceObjectId: clickedObject.id,
          sourcePosition: anchorPosition,
          startX: anchorPoint.x,
          startY: anchorPoint.y,
          currentX: canvasPos.x,
          currentY: canvasPos.y,
        })
        setIsDrawing(true)
      }
    } else if (currentTool === 'laser') {
      // Laser aktivieren bei Mausklick
      setLaserState({ isPressed: true, isActive: true, x: canvasPos.x, y: canvasPos.y, trail: [] })
    } else if (currentTool === 'select') {
      // Check if clicked on an object
      const clickedObject = findObjectAtPosition(canvasPos)
      const now = Date.now()
      const shiftKey = e.evt.shiftKey
      
      if (clickedObject) {
        // Check for double-click to edit text
        const isDoubleClick = 
          lastClickedObject.current === clickedObject.id && 
          now - lastClickTime.current < 300
        
        if (isDoubleClick && (clickedObject.type === 'text' || clickedObject.type === 'sticky')) {
          // Open text editor
          const screenX = clickedObject.x * viewport.scale + viewport.x
          const screenY = clickedObject.y * viewport.scale + viewport.y
          setTextEditState({
            objectId: clickedObject.id,
            screenX,
            screenY,
            visible: true,
          })
          setTimeout(() => {
            if (textEditRef.current) {
              textEditRef.current.focus()
              textEditRef.current.select()
            }
          }, 50)
          // Reset click tracking
          lastClickTime.current = 0
          lastClickedObject.current = null
          return
        }
        
        // Track for double-click detection
        lastClickTime.current = now
        lastClickedObject.current = clickedObject.id
        
        // Select/toggle the object (with Shift support for multi-select)
        toggleSelection(clickedObject.id, shiftKey)
        
        // Build multi-drag start positions map
        const multiDragStartPositions = new Map<string, { x: number; y: number }>()
        // If this object is already in selection (or will be), collect all selected positions
        const effectiveSelection = shiftKey 
          ? new Set([...selectedIds, clickedObject.id])
          : new Set([clickedObject.id])
        
        effectiveSelection.forEach(id => {
          const obj = objects.get(id)
          if (obj) {
            multiDragStartPositions.set(id, { x: obj.x, y: obj.y })
          }
        })
        
        // Start dragging (auch für multi-select)
        setDragState({
          objectId: clickedObject.id,
          startCanvasPos: canvasPos,
          objectStartPos: { x: clickedObject.x, y: clickedObject.y },
          multiDragStartPositions,
        })
      } else {
        // Clicked on empty area - start selection box (unless Shift is held to keep selection)
        if (!shiftKey) {
          setSelectedIds(new Set())
        }
        // Start drawing selection box
        setSelectionBox({
          startX: canvasPos.x,
          startY: canvasPos.y,
          currentX: canvasPos.x,
          currentY: canvasPos.y,
        })
        lastClickedObject.current = null
      }
    }
  }
  
  // Helper: Get anchor point position on object
  const getAnchorPoint = (obj: CanvasObject, position: AnchorPosition) => {
    const centerX = obj.x + obj.width / 2
    const centerY = obj.y + obj.height / 2
    switch (position) {
      case 'top': return { x: centerX, y: obj.y }
      case 'right': return { x: obj.x + obj.width, y: centerY }
      case 'bottom': return { x: centerX, y: obj.y + obj.height }
      case 'left': return { x: obj.x, y: centerY }
      case 'center': return { x: centerX, y: centerY }
    }
  }
  
  // Helper: Get closest anchor to a point
  const getClosestAnchor = (obj: CanvasObject, pos: { x: number; y: number }): AnchorPosition => {
    const anchors: AnchorPosition[] = ['top', 'right', 'bottom', 'left']
    let closest: AnchorPosition = 'center'
    let minDist = Infinity
    
    for (const anchor of anchors) {
      const point = getAnchorPoint(obj, anchor)
      const dist = Math.hypot(point.x - pos.x, point.y - pos.y)
      if (dist < minDist) {
        minDist = dist
        closest = anchor
      }
    }
    return closest
  }
  
  // Find object at position for selection
  const findObjectAtPosition = (pos: { x: number; y: number }): CanvasObject | null => {
    // Check in reverse order (top-most first)
    const objectsArray = Array.from(objects.values())
    for (let i = objectsArray.length - 1; i >= 0; i--) {
      const obj = objectsArray[i]
      if (
        pos.x >= obj.x && 
        pos.x <= obj.x + obj.width &&
        pos.y >= obj.y && 
        pos.y <= obj.y + obj.height
      ) {
        return obj
      }
    }
    return null
  }
  
  const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage()
    const pos = stage?.getPointerPosition()
    if (!pos) return
    
    // Rechtsklick-Pan
    if (isRightClickPanning && lastPanPos) {
      const dx = pos.x - lastPanPos.x
      const dy = pos.y - lastPanPos.y
      setViewport({
        x: viewport.x + dx,
        y: viewport.y + dy,
      })
      setLastPanPos({ x: pos.x, y: pos.y })
      return
    }
    
    const canvasPos = screenToCanvas(pos.x, pos.y)
    
    // Send cursor position (throttled to ~30fps)
    const now = Date.now()
    if (onCursorMove && now - lastCursorUpdate.current > 33) {
      lastCursorUpdate.current = now
      onCursorMove(canvasPos.x, canvasPos.y)
    }
    
    // Handle dragging objects with select tool (supports multi-select drag)
    if (currentTool === 'select' && dragState) {
      const dx = canvasPos.x - dragState.startCanvasPos.x
      const dy = canvasPos.y - dragState.startCanvasPos.y
      
      // Move all objects that were in the selection when drag started
      if (dragState.multiDragStartPositions && dragState.multiDragStartPositions.size > 1) {
        dragState.multiDragStartPositions.forEach((startPos, id) => {
          updateObject(id, { 
            x: startPos.x + dx, 
            y: startPos.y + dy 
          }, false)
        })
        // Update connector paths after moving objects
        updateConnectorPaths()
      } else {
        // Single object drag
        const newX = dragState.objectStartPos.x + dx
        const newY = dragState.objectStartPos.y + dy
        updateObject(dragState.objectId, { x: newX, y: newY }, false)
        // Update connector paths after moving object
        updateConnectorPaths()
      }
    }
    
    // Update selection box while dragging
    if (currentTool === 'select' && selectionBox) {
      setSelectionBox({
        ...selectionBox,
        currentX: canvasPos.x,
        currentY: canvasPos.y,
      })
    }
    
    // Update eraser preview position
    if (currentTool === 'eraser') {
      setEraserPosition(canvasPos)
    }
    
    // Update pen cursor position
    if (currentTool === 'pen') {
      setPenPosition(canvasPos)
    }
    
    // Drawing with pen
    if (isDrawing && currentTool === 'pen') {
      addStrokePoint(canvasPos)
    }
    
    // Erasing while dragging
    if (isDrawing && currentTool === 'eraser') {
      eraseAtPoint(canvasPos.x, canvasPos.y, toolSettings.eraserWidth / 2)
    }
    
    // Drawing shape - update preview
    if (isDrawing && currentTool === 'shape' && shapeDrawing) {
      setShapeDrawing({
        ...shapeDrawing,
        currentX: canvasPos.x,
        currentY: canvasPos.y,
      })
    }
    
    // Drawing connector - update endpoint
    if (isDrawing && currentTool === 'connector' && connectorDrawing) {
      setConnectorDrawing({
        ...connectorDrawing,
        currentX: canvasPos.x,
        currentY: canvasPos.y,
      })
    }
    
    // Laser pointer - update position and trail (nur wenn gedrückt)
    if (currentTool === 'laser' && laserState.isPressed) {
      setLaserState({ x: canvasPos.x, y: canvasPos.y })
      addLaserTrailPoint(canvasPos.x, canvasPos.y)
    }
  }
  
  // Helper function to find objects within a selection box
  const findObjectsInBox = (box: { startX: number; startY: number; currentX: number; currentY: number }): string[] => {
    const minX = Math.min(box.startX, box.currentX)
    const maxX = Math.max(box.startX, box.currentX)
    const minY = Math.min(box.startY, box.currentY)
    const maxY = Math.max(box.startY, box.currentY)
    
    const foundIds: string[] = []
    objects.forEach((obj, id) => {
      // Check if object intersects with selection box
      const objRight = obj.x + obj.width
      const objBottom = obj.y + obj.height
      
      const intersects = 
        obj.x < maxX && objRight > minX &&
        obj.y < maxY && objBottom > minY
      
      if (intersects) {
        foundIds.push(id)
      }
    })
    return foundIds
  }
  
  const handlePointerUp = () => {
    // Beende Rechtsklick-Pan
    if (isRightClickPanning) {
      setIsRightClickPanning(false)
      setLastPanPos(null)
      return
    }

    // Workspace-Draw-Modus: Bereich finalisieren
    if (workspaceDrawMode && workspaceDrawBox) {
      const minSize = 20
      const x1 = Math.min(workspaceDrawBox.startX, workspaceDrawBox.currentX)
      const y1 = Math.min(workspaceDrawBox.startY, workspaceDrawBox.currentY)
      const x2 = Math.max(workspaceDrawBox.startX, workspaceDrawBox.currentX)
      const y2 = Math.max(workspaceDrawBox.startY, workspaceDrawBox.currentY)
      setWorkspaceDrawBox(null)
      setWorkspaceDrawMode(false)

      if (Math.abs(x2 - x1) >= minSize && Math.abs(y2 - y1) >= minSize) {
        window.dispatchEvent(new CustomEvent('workspace_region:draft', { detail: { x1, y1, x2, y2 } }))
      }
      return
    }
    
    // Laser deaktivieren bei Maus loslassen
    if (currentTool === 'laser' && laserState.isPressed) {
      setLaserState({ isPressed: false })
      // Trail nach kurzer Verzögerung clearen für Fade-out
      setTimeout(() => {
        clearLaserTrail()
      }, 300)
    }
    
    // End selection box and select objects inside
    if (selectionBox) {
      const objectsInBox = findObjectsInBox(selectionBox)
      if (objectsInBox.length > 0) {
        // Add to existing selection or create new
        const newSelection = new Set(selectedIds)
        objectsInBox.forEach(id => newSelection.add(id))
        setSelectedIds(newSelection)
      }
      setSelectionBox(null)
    }
    
    // End dragging for select tool
    if (dragState) {
      setDragState(null)
    }
    
    if (!isDrawing) return
    
    if (currentTool === 'pen' && currentStroke.length > 1) {
      const id = `stroke-${Date.now()}`
      const points = currentStroke.flatMap(p => [p.x, p.y])
      const minX = Math.min(...currentStroke.map(p => p.x))
      const minY = Math.min(...currentStroke.map(p => p.y))
      const maxX = Math.max(...currentStroke.map(p => p.x))
      const maxY = Math.max(...currentStroke.map(p => p.y))
      
      const newObject: CanvasObject = {
        id,
        type: 'stroke',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        data: { 
          points, 
          stroke: toolSettings.color, 
          strokeWidth: toolSettings.strokeWidth,
        },
        createdAt: Date.now(),
      }
      
      addObject(newObject)
      
      // Broadcast to other users
      if (onObjectCreate) {
        onObjectCreate(newObject)
      }
    }
    
    // Create shape from drag
    if (currentTool === 'shape' && shapeDrawing) {
      const { startX, startY, currentX, currentY, shapeType } = shapeDrawing
      const x = Math.min(startX, currentX)
      const y = Math.min(startY, currentY)
      const width = Math.abs(currentX - startX)
      const height = Math.abs(currentY - startY)
      
      // Only create if shape has meaningful size
      if (width > 1 || height > 1) {
        const id = `shape-${Date.now()}`
        const newObject: CanvasObject = {
          id,
          type: 'shape',
          x,
          y,
          width: width || 1,
          height: height || 1,
          data: { 
            shapeType,
            fill: toolSettings.fillColor,
            stroke: toolSettings.color,
            strokeWidth: toolSettings.shapeStrokeWidth,
            // Store original points for line/arrow
            startX: startX < currentX ? 0 : width,
            startY: startY < currentY ? 0 : height,
            endX: startX < currentX ? width : 0,
            endY: startY < currentY ? height : 0,
          },
          createdAt: Date.now(),
        }
        addObject(newObject)
        onObjectCreate?.(newObject)
      }
      setShapeDrawing(null)
    }
    
    // Create connector from drag
    if (currentTool === 'connector' && connectorDrawing) {
      // Find target object at current position
      const targetObject = findObjectAtPosition({ x: connectorDrawing.currentX, y: connectorDrawing.currentY })
      
      if (targetObject && targetObject.id !== connectorDrawing.sourceObjectId && targetObject.type !== 'connector') {
        const targetPosition = getClosestAnchor(targetObject, { x: connectorDrawing.currentX, y: connectorDrawing.currentY })
        
        const sourceAnchor: ConnectorAnchor = {
          objectId: connectorDrawing.sourceObjectId,
          position: connectorDrawing.sourcePosition,
        }
        const targetAnchor: ConnectorAnchor = {
          objectId: targetObject.id,
          position: targetPosition,
        }
        
        createConnector(sourceAnchor, targetAnchor)
      }
      setConnectorDrawing(null)
    }
    
    setIsDrawing(false)
    clearStroke()
  }
  
  // Handle text input submission
  const handleTextSubmit = () => {
    const text = textInputRef.current?.value.trim()
    if (text) {
      const canvasPos = screenToCanvas(textInput.x, textInput.y)
      const id = `text-${Date.now()}`
      const newObject: CanvasObject = {
        id,
        type: 'text',
        x: canvasPos.x,
        y: canvasPos.y,
        width: text.length * toolSettings.fontSize * 0.6,
        height: toolSettings.fontSize * 1.2,
        data: { 
          text, 
          fontSize: toolSettings.fontSize,
          fontFamily: 'Inter, system-ui, sans-serif',
          fill: toolSettings.color,
        },
        createdAt: Date.now(),
      }
      addObject(newObject)
      onObjectCreate?.(newObject)
    }
    setTextInput({ x: 0, y: 0, visible: false })
    if (textInputRef.current) {
      textInputRef.current.value = ''
    }
  }
  
  // Handle text edit submission (double-click edit)
  const handleTextEditSubmit = () => {
    if (!textEditState || !textEditRef.current) return
    
    const text = textEditRef.current.value.trim()
    const obj = objects.get(textEditState.objectId)
    
    if (obj && text) {
      if (obj.type === 'text') {
        // Update text object
        const fontSize = (obj.data as { fontSize: number }).fontSize || 24
        updateObject(textEditState.objectId, {
          width: text.length * fontSize * 0.6,
          data: { ...obj.data, text },
        })
      } else if (obj.type === 'sticky') {
        // Update sticky note text
        updateObject(textEditState.objectId, {
          data: { ...obj.data, text },
        })
      }
    }
    
    setTextEditState(null)
  }
  
  // Get cursor style based on current tool
  const getCursorStyle = () => {
    if (workspaceDrawMode) return 'crosshair'
    switch (currentTool) {
      case 'pan': return 'grab'
      case 'select': return dragState ? 'grabbing' : 'default'
      case 'eraser': return 'none' // We show custom eraser cursor
      default: return 'crosshair'
    }
  }
  
  // Render adaptive grid pattern with orientation squares
  const renderGrid = () => {
    const elements: JSX.Element[] = []
    const stage = stageRef.current
    if (!stage) return elements
    
    const width = stage.width()
    const height = stage.height()
    
    // Calculate visible area in canvas coords
    const viewMinX = -viewport.x / viewport.scale
    const viewMinY = -viewport.y / viewport.scale
    const viewMaxX = viewMinX + width / viewport.scale
    const viewMaxY = viewMinY + height / viewport.scale
    
    // Determine appropriate grid size based on zoom level
    // Grid adapts: bei sehr hohem Zoom werden Vierecke immer kleiner
    const viewportWidth = viewMaxX - viewMinX
    const targetGridLines = 20 // Ungefähr so viele Linien sollen sichtbar sein
    
    // Finde die passende Grid-Größe (Vielfache von 10)
    const rawGridSize = viewportWidth / targetGridLines
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawGridSize)))
    const normalized = rawGridSize / magnitude
    
    let adaptiveGridSize: number
    if (normalized < 1.5) adaptiveGridSize = magnitude
    else if (normalized < 3.5) adaptiveGridSize = 2.5 * magnitude
    else if (normalized < 7.5) adaptiveGridSize = 5 * magnitude
    else adaptiveGridSize = 10 * magnitude
    
    // Mindestgröße für sehr hohen Zoom (bis auf Pixel-Niveau)
    adaptiveGridSize = Math.max(adaptiveGridSize, 0.0001)
    
    const startX = Math.floor(viewMinX / adaptiveGridSize) * adaptiveGridSize
    const startY = Math.floor(viewMinY / adaptiveGridSize) * adaptiveGridSize
    const endX = Math.ceil(viewMaxX / adaptiveGridSize) * adaptiveGridSize
    const endY = Math.ceil(viewMaxY / adaptiveGridSize) * adaptiveGridSize
    
    // Bestimme Farbe basierend auf Zoom-Level
    // grün (normal) → gelb → orange → rot (Pixel-Niveau)
    const getZoomColor = () => {
      const scale = viewport.scale
      if (scale <= 1) return { primary: '#2a2a4a', secondary: '#1a1a3a' } // Normal
      if (scale <= 10) return { primary: '#3a4a2a', secondary: '#2a3a1a' } // Leicht grün
      if (scale <= 100) return { primary: '#4a4a2a', secondary: '#3a3a1a' } // Gelb
      if (scale <= 1000) return { primary: '#4a3a2a', secondary: '#3a2a1a' } // Orange
      if (scale <= 10000) return { primary: '#4a2a2a', secondary: '#3a1a1a' } // Rot
      return { primary: '#5a1a1a', secondary: '#4a0a0a' } // Tiefrot - Pixelbereich
    }
    
    const colors = getZoomColor()
    
    // Zeichne Hauptlinien
    for (let x = startX; x <= endX; x += adaptiveGridSize) {
      const isMajor = Math.abs(x % (adaptiveGridSize * 5)) < adaptiveGridSize * 0.01
      elements.push(
        <Line
          key={`v-${x}`}
          points={[x, startY, x, endY]}
          stroke={isMajor ? colors.primary : colors.secondary}
          strokeWidth={(isMajor ? 1.5 : 0.5) / viewport.scale}
          listening={false}
        />
      )
    }
    
    for (let y = startY; y <= endY; y += adaptiveGridSize) {
      const isMajor = Math.abs(y % (adaptiveGridSize * 5)) < adaptiveGridSize * 0.01
      elements.push(
        <Line
          key={`h-${y}`}
          points={[startX, y, endX, y]}
          stroke={isMajor ? colors.primary : colors.secondary}
          strokeWidth={(isMajor ? 1.5 : 0.5) / viewport.scale}
          listening={false}
        />
      )
    }
    
    return elements
  }
  
  // Render workspace regions (Phase 4)
  const renderWorkspaceRegions = () => {
    const currentUserId = useCanvasStore.getState().currentUserId
    
    return workspaceRegions
      .filter((region) => region?.bounds)
      .map((region) => {
      const width = region.bounds.x2 - region.bounds.x1
      const height = region.bounds.y2 - region.bounds.y1
      
      // Check user permission for this region
      const userPermission = region.permissions.find(
        (p) => p.userId === currentUserId || p.userId === '*'
      )
      const canEdit = userPermission?.role === 'editor'
      const isViewer = userPermission?.role === 'viewer'
      
      // Adjust opacity based on permission
      const fillOpacity = canEdit ? 0.05 : isViewer ? 0.08 : 0.12
      
      return (
        <Group key={region.id}>
          {/* Region background */}
          <Rect
            x={region.bounds.x1}
            y={region.bounds.y1}
            width={width}
            height={height}
            fill={region.color}
            opacity={fillOpacity}
            stroke={region.color}
            strokeWidth={2 / viewport.scale}
            dash={[10 / viewport.scale, 5 / viewport.scale]}
            cornerRadius={8 / viewport.scale}
            listening={false}
          />
          
          {/* Region label background */}
          <Rect
            x={region.bounds.x1 + 8 / viewport.scale}
            y={region.bounds.y1 + 8 / viewport.scale}
            width={(region.name.length * 8 + 30) / viewport.scale}
            height={28 / viewport.scale}
            fill={region.color}
            opacity={0.9}
            cornerRadius={4 / viewport.scale}
            listening={false}
          />
          
          {/* Permission indicator + Region name */}
          <Text
            x={region.bounds.x1 + 14 / viewport.scale}
            y={region.bounds.y1 + 14 / viewport.scale}
            text={`${canEdit ? 'E' : isViewer ? 'V' : 'X'} ${region.name}`}
            fontSize={12 / viewport.scale}
            fill="#ffffff"
            fontStyle="bold"
            listening={false}
          />
          
          {/* Lock indicator if locked */}
          {region.isLocked && (
            <>
              <Rect
                x={region.bounds.x2 - 32 / viewport.scale}
                y={region.bounds.y1 + 8 / viewport.scale}
                width={24 / viewport.scale}
                height={24 / viewport.scale}
                fill="rgba(0,0,0,0.5)"
                cornerRadius={4 / viewport.scale}
                listening={false}
              />
              <Text
                x={region.bounds.x2 - 27 / viewport.scale}
                y={region.bounds.y1 + 13 / viewport.scale}
                text="L"
                fontSize={12 / viewport.scale}
                listening={false}
              />
            </>
          )}
        </Group>
      )
    })
  }

  // Pixelated overlays for no-access regions
  const renderWorkspaceObscureOverlays = () => {
    const currentUserId = useCanvasStore.getState().currentUserId

    return workspaceRegions
      .filter((region) => region?.bounds && region.obscureNoAccess)
      .map((region) => {
        const userPermission = region.permissions.find(
          (p) => p.userId === currentUserId || p.userId === '*'
        )
        const hasAccess = userPermission && userPermission.role !== 'none'
        if (hasAccess) return null

        const width = region.bounds.x2 - region.bounds.x1
        const height = region.bounds.y2 - region.bounds.y1

        return (
          <Rect
            key={`obscure-${region.id}`}
            x={region.bounds.x1}
            y={region.bounds.y1}
            width={width}
            height={height}
            fillPatternImage={pixelPattern}
            fillPatternRepeat="repeat"
            fillPatternScale={{ x: 1 / viewport.scale, y: 1 / viewport.scale }}
            opacity={1}
            listening={false}
          />
        )
      })
  }
  
  
  // Render objects
  const renderObjects = () => {
    const elements: JSX.Element[] = []
    
    objects.forEach((obj) => {
      const isSelected = selectedIds.has(obj.id)
      
      if (obj.type === 'stroke') {
        const { points, stroke, strokeWidth } = obj.data as {
          points: number[]
          stroke: string
          strokeWidth: number
        }
        elements.push(
          <Line
            key={obj.id}
            points={points}
            stroke={stroke}
            strokeWidth={strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            hitStrokeWidth={0}
          />
        )
      } else if (obj.type === 'text') {
        const { text, fontSize, fontFamily, fill } = obj.data as {
          text: string
          fontSize: number
          fontFamily: string
          fill: string
        }
        elements.push(
          <Text
            key={obj.id}
            x={obj.x}
            y={obj.y}
            text={text}
            fontSize={fontSize}
            fontFamily={fontFamily}
            fill={fill}
          />
        )
      } else if (obj.type === 'shape') {
        const { shapeType, fill, stroke, strokeWidth, startX, startY, endX, endY } = obj.data as {
          shapeType: string
          fill: string
          stroke: string
          strokeWidth: number
          startX?: number
          startY?: number
          endX?: number
          endY?: number
        }
        if (shapeType === 'rect') {
          elements.push(
            <Rect
              key={obj.id}
              x={obj.x}
              y={obj.y}
              width={obj.width}
              height={obj.height}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              perfectDrawEnabled={false}
            />
          )
        } else if (shapeType === 'circle') {
          elements.push(
            <Circle
              key={obj.id}
              x={obj.x + obj.width / 2}
              y={obj.y + obj.height / 2}
              radius={Math.min(obj.width, obj.height) / 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              perfectDrawEnabled={false}
            />
          )
        } else if (shapeType === 'triangle') {
          elements.push(
            <RegularPolygon
              key={obj.id}
              x={obj.x + obj.width / 2}
              y={obj.y + obj.height / 2}
              sides={3}
              radius={Math.min(obj.width, obj.height) / 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              perfectDrawEnabled={false}
            />
          )
        } else if (shapeType === 'diamond') {
          elements.push(
            <RegularPolygon
              key={obj.id}
              x={obj.x + obj.width / 2}
              y={obj.y + obj.height / 2}
              sides={4}
              radius={Math.min(obj.width, obj.height) / 2 * Math.SQRT2}
              rotation={45}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              perfectDrawEnabled={false}
            />
          )
        } else if (shapeType === 'line' && startX !== undefined && startY !== undefined && endX !== undefined && endY !== undefined) {
          elements.push(
            <Line
              key={obj.id}
              points={[startX, startY, endX, endY]}
              stroke={stroke}
              strokeWidth={strokeWidth}
              lineCap="round"
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
            />
          )
        } else if (shapeType === 'arrow' && startX !== undefined && startY !== undefined && endX !== undefined && endY !== undefined) {
          elements.push(
            <Arrow
              key={obj.id}
              points={[startX, startY, endX, endY]}
              stroke={stroke}
              strokeWidth={strokeWidth}
              fill={stroke}
              pointerLength={strokeWidth * 3}
              pointerWidth={strokeWidth * 3}
              lineCap="round"
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
            />
          )
        }
      } else if (obj.type === 'sticky') {
        const { text, color } = obj.data as { text: string; color: string }
        
        // Shadow
        elements.push(
          <Rect
            key={`${obj.id}-shadow`}
            x={obj.x + 3}
            y={obj.y + 3}
            width={obj.width}
            height={obj.height}
            fill="rgba(0,0,0,0.15)"
            cornerRadius={4}
            listening={false}
          />
        )
        
        // Main background (not draggable - use top handle instead)
        elements.push(
          <Rect
            key={`${obj.id}-bg`}
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
            fill={color}
            cornerRadius={4}
            stroke={isSelected ? '#4F46E5' : 'rgba(0,0,0,0.1)'}
            strokeWidth={isSelected ? 3 / viewport.scale : 1 / viewport.scale}
            onClick={() => setSelectedIds(new Set([obj.id]))}
            onDblClick={() => {
              // Open text edit for this sticky
              const stage = stageRef.current
              if (!stage) return
              const stageBox = stage.container().getBoundingClientRect()
              const screenX = stageBox.left + (obj.x * viewport.scale) + viewport.x
              const screenY = stageBox.top + (obj.y * viewport.scale) + viewport.y
              setTextEditState({
                objectId: obj.id,
                screenX,
                screenY,
                visible: true,
              })
              setTimeout(() => textEditRef.current?.focus(), 50)
            }}
          />
        )
        
        // Fold effect
        elements.push(
          <Rect
            key={`${obj.id}-fold`}
            x={obj.x + obj.width - 20}
            y={obj.y}
            width={20}
            height={20}
            fill="rgba(0,0,0,0.08)"
            listening={false}
          />
        )
        
        // Text
        elements.push(
          <Text
            key={`${obj.id}-text`}
            x={obj.x + 12}
            y={obj.y + 12}
            text={text || 'Doppelklick zum Schreiben...'}
            fontSize={14}
            fontFamily="Inter, system-ui, sans-serif"
            fill={text ? '#1F2937' : 'rgba(0,0,0,0.3)'}
            width={obj.width - 24}
            height={obj.height - 24}
            wrap="word"
            listening={false}
          />
        )
        
        // Resize handles when selected - at top edge
        if (isSelected) {
          const handleSize = 12 / viewport.scale
          const handleY = obj.y - handleSize - 4 / viewport.scale
          
          // Top bar background
          elements.push(
            <Rect
              key={`${obj.id}-topbar`}
              x={obj.x}
              y={handleY}
              width={obj.width}
              height={handleSize}
              fill="rgba(79, 70, 229, 0.9)"
              cornerRadius={handleSize / 2}
              listening={false}
            />
          )
          
          // Left resize handle (shrink width from left)
          elements.push(
            <Rect
              key={`${obj.id}-handle-left`}
              x={obj.x}
              y={handleY}
              width={handleSize * 2}
              height={handleSize}
              fill="#4F46E5"
              cornerRadius={handleSize / 2}
              draggable
              onDragMove={(e) => {
                const deltaX = e.target.x() - obj.x
                const newWidth = Math.max(100, obj.width - deltaX)
                const newX = obj.x + (obj.width - newWidth)
                e.target.x(newX) // Keep handle at new left edge
              }}
              onDragEnd={(e) => {
                const deltaX = e.target.x() - obj.x
                const newWidth = Math.max(100, obj.width - deltaX)
                const newX = obj.x + (obj.width - newWidth)
                updateObject(obj.id, { x: newX, width: newWidth }, true)
              }}
            />
          )
          
          // Center drag handle (move the note)
          elements.push(
            <Rect
              key={`${obj.id}-handle-center`}
              x={obj.x + obj.width/2 - handleSize * 2}
              y={handleY}
              width={handleSize * 4}
              height={handleSize}
              fill="#6366F1"
              cornerRadius={handleSize / 2}
              draggable
              onDragEnd={(e) => {
                const deltaX = e.target.x() - (obj.x + obj.width/2 - handleSize * 2)
                const deltaY = e.target.y() - handleY
                updateObject(obj.id, { 
                  x: obj.x + deltaX, 
                  y: obj.y + deltaY 
                }, true)
              }}
            />
          )
          
          // Move icon in center handle
          elements.push(
            <Text
              key={`${obj.id}-handle-center-icon`}
              x={obj.x + obj.width/2 - handleSize}
              y={handleY + 1 / viewport.scale}
              text="⋮⋮"
              fontSize={handleSize * 0.8}
              fill="white"
              listening={false}
            />
          )
          
          // Right resize handle (expand width)
          elements.push(
            <Rect
              key={`${obj.id}-handle-right`}
              x={obj.x + obj.width - handleSize * 2}
              y={handleY}
              width={handleSize * 2}
              height={handleSize}
              fill="#4F46E5"
              cornerRadius={handleSize / 2}
              draggable
              onDragMove={(e) => {
                const newWidth = Math.max(100, e.target.x() + handleSize * 2 - obj.x)
                e.target.x(obj.x + newWidth - handleSize * 2)
              }}
              onDragEnd={(e) => {
                const newWidth = Math.max(100, e.target.x() + handleSize * 2 - obj.x)
                updateObject(obj.id, { width: newWidth }, true)
              }}
            />
          )
          
          // Bottom edge resize handle for height
          elements.push(
            <Rect
              key={`${obj.id}-handle-bottom`}
              x={obj.x + obj.width/2 - handleSize * 2}
              y={obj.y + obj.height - 3 / viewport.scale}
              width={handleSize * 4}
              height={6 / viewport.scale}
              fill="#4F46E5"
              cornerRadius={3 / viewport.scale}
              draggable
              onDragMove={(e) => {
                const newHeight = Math.max(80, e.target.y() + 3 / viewport.scale - obj.y)
                e.target.y(obj.y + newHeight - 3 / viewport.scale)
                e.target.x(obj.x + obj.width/2 - handleSize * 2) // Lock X position
              }}
              onDragEnd={(e) => {
                const newHeight = Math.max(80, e.target.y() + 3 / viewport.scale - obj.y)
                updateObject(obj.id, { height: newHeight }, true)
              }}
            />
          )
        }
      } else if (obj.type === 'connector') {
        // Render connector line between two objects
        const connectorData = obj.data as {
          sourceAnchor: ConnectorAnchor
          targetAnchor: ConnectorAnchor
          lineType: 'straight' | 'curved' | 'elbow'
          startArrow: 'none' | 'arrow' | 'dot' | 'diamond'
          endArrow: 'none' | 'arrow' | 'dot' | 'diamond'
          stroke: string
          strokeWidth: number
          points: number[]
        }
        
        const { lineType, startArrow, endArrow, stroke, strokeWidth, points } = connectorData
        
        if (points.length >= 4) {
          const [x1, y1, x2, y2] = points
          
          // Calculate path based on line type
          let pathPoints: number[] = []
          if (lineType === 'straight') {
            pathPoints = [x1, y1, x2, y2]
          } else if (lineType === 'curved') {
            const midX = (x1 + x2) / 2
            pathPoints = [x1, y1, midX, y1, midX, y2, x2, y2]
          } else if (lineType === 'elbow') {
            const midX = (x1 + x2) / 2
            pathPoints = [x1, y1, midX, y1, midX, y2, x2, y2]
          }
          
          // Main line
          if (endArrow === 'arrow' && lineType === 'straight') {
            elements.push(
              <Arrow
                key={obj.id}
                points={pathPoints}
                stroke={isSelected ? '#4F46E5' : stroke}
                strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
                fill={isSelected ? '#4F46E5' : stroke}
                pointerLength={10}
                pointerWidth={10}
                lineCap="round"
                onClick={() => setSelectedIds(new Set([obj.id]))}
                hitStrokeWidth={10}
              />
            )
          } else {
            elements.push(
              <Line
                key={obj.id}
                points={pathPoints}
                stroke={isSelected ? '#4F46E5' : stroke}
                strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
                tension={lineType === 'curved' ? 0.5 : 0}
                lineCap="round"
                lineJoin="round"
                onClick={() => setSelectedIds(new Set([obj.id]))}
                hitStrokeWidth={10}
              />
            )
            
            // End arrow (non-straight)
            if (endArrow === 'arrow') {
              elements.push(
                <Circle
                  key={`${obj.id}-end`}
                  x={x2}
                  y={y2}
                  radius={5}
                  fill={isSelected ? '#4F46E5' : stroke}
                />
              )
            } else if (endArrow === 'dot') {
              elements.push(
                <Circle
                  key={`${obj.id}-end`}
                  x={x2}
                  y={y2}
                  radius={6}
                  fill={isSelected ? '#4F46E5' : stroke}
                />
              )
            }
          }
          
          // Start arrow/dot
          if (startArrow === 'dot') {
            elements.push(
              <Circle
                key={`${obj.id}-start`}
                x={x1}
                y={y1}
                radius={6}
                fill={isSelected ? '#4F46E5' : stroke}
              />
            )
          }
          
          // Selection indicators
          if (isSelected) {
            elements.push(
              <Circle
                key={`${obj.id}-sel1`}
                x={x1}
                y={y1}
                radius={6}
                fill="white"
                stroke="#4F46E5"
                strokeWidth={2}
              />,
              <Circle
                key={`${obj.id}-sel2`}
                x={x2}
                y={y2}
                radius={6}
                fill="white"
                stroke="#4F46E5"
                strokeWidth={2}
              />
            )
          }
        }
      } else if (obj.type === 'image') {
        // Images are rendered via CanvasImage component (defined at top)
        // Skip here - rendered separately via renderImages()
      } else if (obj.type === 'video' || obj.type === 'audio') {
        // Video/Audio rendered as HTML overlays - show placeholder on canvas
        const isVideo = obj.type === 'video'
        const { originalName } = obj.data as { originalName: string }
        
        // Background
        elements.push(
          <Rect
            key={`${obj.id}-bg`}
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
            fill={isVideo ? '#1F2937' : '#1E293B'}
            cornerRadius={8}
            stroke={isSelected ? '#3b82f6' : '#374151'}
            strokeWidth={isSelected ? 3 / viewport.scale : 1 / viewport.scale}
            onClick={() => setSelectedIds(new Set([obj.id]))}
          />
        )
        
        // Icon
        elements.push(
          <Text
            key={`${obj.id}-icon`}
            x={obj.x}
            y={obj.y + (isVideo ? obj.height / 2 - 20 : obj.height / 2 - 15)}
            width={obj.width}
            text={isVideo ? '🎬' : '🎵'}
            fontSize={isVideo ? 32 : 24}
            align="center"
            listening={false}
          />
        )
        
        // Filename
        elements.push(
          <Text
            key={`${obj.id}-name`}
            x={obj.x + 8}
            y={obj.y + obj.height - 24}
            width={obj.width - 16}
            text={originalName || (isVideo ? 'Video' : 'Audio')}
            fontSize={11}
            fill="#9CA3AF"
            align="center"
            ellipsis={true}
            listening={false}
          />
        )
        
        // Resize handle when selected
        if (isSelected) {
          elements.push(
            <Rect
              key={`${obj.id}-resize`}
              x={obj.x + obj.width - 12 / viewport.scale}
              y={obj.y + obj.height - 12 / viewport.scale}
              width={12 / viewport.scale}
              height={12 / viewport.scale}
              fill="#3b82f6"
              cornerRadius={2}
              draggable
              onDragMove={(e) => {
                const newWidth = Math.max(100, e.target.x() + 12 / viewport.scale - obj.x)
                const newHeight = Math.max(60, e.target.y() + 12 / viewport.scale - obj.y)
                e.target.x(obj.x + newWidth - 12 / viewport.scale)
                e.target.y(obj.y + newHeight - 12 / viewport.scale)
              }}
              onDragEnd={(e) => {
                const newWidth = Math.max(100, e.target.x() + 12 / viewport.scale - obj.x)
                const newHeight = Math.max(60, e.target.y() + 12 / viewport.scale - obj.y)
                updateObject(obj.id, { width: newWidth, height: newHeight }, true)
              }}
            />
          )
        }
      }
      
      // Selection indicator (not for sticky notes, images, video, audio - they have their own)
      if (isSelected && obj.type !== 'sticky' && obj.type !== 'image' && obj.type !== 'video' && obj.type !== 'audio') {
        elements.push(
          <Rect
            key={`${obj.id}-selection`}
            x={obj.x - 2}
            y={obj.y - 2}
            width={obj.width + 4}
            height={obj.height + 4}
            stroke="#3b82f6"
            strokeWidth={2 / viewport.scale}
            dash={[6 / viewport.scale, 3 / viewport.scale]}
            listening={false}
          />
        )
      }
    })
    
    return elements
  }
  
  // Get image objects for separate rendering (hooks can't be used in forEach)
  const imageObjects = Array.from(objects.values()).filter(obj => obj.type === 'image')
  
  // Current stroke being drawn
  const renderCurrentStroke = () => {
    if (currentStroke.length < 2) return null
    
    const points = currentStroke.flatMap(p => [p.x, p.y])
    return (
      <Line
        points={points}
        stroke={toolSettings.color}
        strokeWidth={toolSettings.strokeWidth}
        tension={0.5}
        lineCap="round"
        lineJoin="round"
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
        listening={false}
      />
    )
  }
  
  // Render eraser cursor
  const renderEraserCursor = () => {
    if (currentTool !== 'eraser' || !eraserPosition) return null
    
    return (
      <Circle
        x={eraserPosition.x}
        y={eraserPosition.y}
        radius={toolSettings.eraserWidth / 2}
        stroke="#ff6b6b"
        strokeWidth={2 / viewport.scale}
        fill="rgba(255, 107, 107, 0.1)"
        listening={false}
      />
    )
  }
  
  // Render pen cursor
  const renderPenCursor = () => {
    if (currentTool !== 'pen' || !penPosition) return null
    
    return (
      <Circle
        x={penPosition.x}
        y={penPosition.y}
        radius={toolSettings.strokeWidth / 2}
        stroke={toolSettings.color}
        strokeWidth={1.5 / viewport.scale}
        fill={`${toolSettings.color}33`}
        listening={false}
      />
    )
  }
  
  // Render shape preview during drag
  const renderShapePreview = () => {
    if (!shapeDrawing) return null
    
    const { startX, startY, currentX, currentY, shapeType } = shapeDrawing
    const x = Math.min(startX, currentX)
    const y = Math.min(startY, currentY)
    const width = Math.abs(currentX - startX)
    const height = Math.abs(currentY - startY)
    
    const commonProps = {
      stroke: toolSettings.color,
      strokeWidth: toolSettings.strokeWidth,
      fill: toolSettings.fillColor || 'transparent',
      opacity: 0.7,
      listening: false,
      perfectDrawEnabled: false,
    }
    
    if (shapeType === 'rect') {
      return (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          {...commonProps}
        />
      )
    } else if (shapeType === 'circle') {
      return (
        <Circle
          x={x + width / 2}
          y={y + height / 2}
          radius={Math.min(width, height) / 2}
          {...commonProps}
        />
      )
    } else if (shapeType === 'triangle') {
      return (
        <RegularPolygon
          x={x + width / 2}
          y={y + height / 2}
          sides={3}
          radius={Math.min(width, height) / 2}
          {...commonProps}
        />
      )
    } else if (shapeType === 'diamond') {
      return (
        <RegularPolygon
          x={x + width / 2}
          y={y + height / 2}
          sides={4}
          radius={Math.min(width, height) / 2 * Math.SQRT2}
          rotation={45}
          {...commonProps}
        />
      )
    } else if (shapeType === 'line') {
      return (
        <Line
          points={[startX, startY, currentX, currentY]}
          stroke={toolSettings.color}
          strokeWidth={toolSettings.strokeWidth}
          lineCap="round"
          opacity={0.7}
          listening={false}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      )
    } else if (shapeType === 'arrow') {
      return (
        <Arrow
          points={[startX, startY, currentX, currentY]}
          stroke={toolSettings.color}
          strokeWidth={toolSettings.strokeWidth}
          fill={toolSettings.color}
          pointerLength={toolSettings.strokeWidth * 3}
          pointerWidth={toolSettings.strokeWidth * 3}
          lineCap="round"
          opacity={0.7}
          listening={false}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      )
    }
    
    return null
  }
  
  // Render connector preview during drag
  const renderConnectorPreview = () => {
    if (!connectorDrawing) return null
    
    const { startX, startY, currentX, currentY } = connectorDrawing
    
    return (
      <Group>
        {/* Preview line */}
        <Line
          points={[startX, startY, currentX, currentY]}
          stroke={toolSettings.color}
          strokeWidth={2}
          dash={[10, 5]}
          opacity={0.7}
          listening={false}
        />
        
        {/* Source anchor indicator */}
        <Circle
          x={startX}
          y={startY}
          radius={8 / viewport.scale}
          fill="#4F46E5"
          stroke="white"
          strokeWidth={2 / viewport.scale}
          listening={false}
        />
        
        {/* Target indicator */}
        <Circle
          x={currentX}
          y={currentY}
          radius={6 / viewport.scale}
          fill="white"
          stroke="#4F46E5"
          strokeWidth={2 / viewport.scale}
          listening={false}
        />
      </Group>
    )
  }
  
  // Render laser pointer (aus Store)
  const renderLaserPointer = () => {
    if (currentTool !== 'laser' || !laserState.isPressed) return null
    
    const sizeMultiplier = laserState.size * 4
    const dotSize = sizeMultiplier / viewport.scale
    const trailWidth = (laserState.size * 1.5) / viewport.scale
    const color = laserState.color
    
    return (
      <Group>
        {/* Trail */}
        {laserState.trail.length > 1 && (
          <Line
            points={laserState.trail.flatMap(p => [p.x, p.y])}
            stroke={color}
            strokeWidth={trailWidth}
            lineCap="round"
            lineJoin="round"
            opacity={0.6}
            tension={0.5}
            listening={false}
          />
        )}
        
        {/* Laser dot */}
        <Group x={laserState.x} y={laserState.y}>
          {/* Outer glow */}
          <Circle
            radius={dotSize * 2}
            fill="transparent"
            stroke={color}
            strokeWidth={2 / viewport.scale}
            opacity={0.3}
            listening={false}
          />
          
          {/* Middle ring */}
          <Circle
            radius={dotSize * 1.2}
            fill={color}
            opacity={0.4}
            shadowColor={color}
            shadowBlur={20 / viewport.scale}
            shadowOpacity={0.8}
            listening={false}
          />
          
          {/* Core */}
          <Circle
            radius={dotSize * 0.6}
            fill={color}
            shadowColor={color}
            shadowBlur={10 / viewport.scale}
            shadowOpacity={1}
            listening={false}
          />
          
          {/* White center */}
          <Circle
            radius={dotSize * 0.3}
            fill="white"
            opacity={0.9}
            listening={false}
          />
        </Group>
      </Group>
    )
  }
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full touch-none"
      style={{ cursor: isRightClickPanning ? 'grabbing' : getCursorStyle() }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setEraserPosition(null)
          setPenPosition(null)
        }}
      >
        <Layer listening={false}>
          {renderGrid()}
        </Layer>
        <Layer listening={false}>
          {/* Workspace Regions - Phase 4 */}
          {renderWorkspaceRegions()}
        </Layer>
        <Layer>
          {renderObjects()}
          {/* Render images separately because they use hooks */}
          {imageObjects.map(obj => (
            <CanvasImage
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.has(obj.id)}
              viewport={viewport}
              onSelect={() => setSelectedIds(new Set([obj.id]))}
              onUpdate={(changes) => updateObject(obj.id, changes, true)}
            />
          ))}
          {renderCurrentStroke()}
          {renderShapePreview()}
          {renderConnectorPreview()}
          {renderLaserPointer()}
          {/* Selection box */}
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.startX, selectionBox.currentX)}
              y={Math.min(selectionBox.startY, selectionBox.currentY)}
              width={Math.abs(selectionBox.currentX - selectionBox.startX)}
              height={Math.abs(selectionBox.currentY - selectionBox.startY)}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={1 / viewport.scale}
              dash={[5 / viewport.scale, 5 / viewport.scale]}
            />
          )}
          {workspaceDrawBox && (
            <Rect
              x={Math.min(workspaceDrawBox.startX, workspaceDrawBox.currentX)}
              y={Math.min(workspaceDrawBox.startY, workspaceDrawBox.currentY)}
              width={Math.abs(workspaceDrawBox.currentX - workspaceDrawBox.startX)}
              height={Math.abs(workspaceDrawBox.currentY - workspaceDrawBox.startY)}
              fill="rgba(16, 185, 129, 0.08)"
              stroke="#10b981"
              strokeWidth={1.5 / viewport.scale}
              dash={[8 / viewport.scale, 6 / viewport.scale]}
            />
          )}
        </Layer>
        <Layer listening={false}>
          {renderWorkspaceObscureOverlays()}
        </Layer>
        <Layer>
          {/* Origin marker */}
          <Circle x={0} y={0} radius={5} fill="#4ade80" />
          {renderEraserCursor()}
          {renderPenCursor()}
        </Layer>
      </Stage>
      
      {/* Text input overlay */}
      {textInput.visible && (
        <div
          className="fixed z-50"
          style={{ left: textInput.x, top: textInput.y }}
        >
          <textarea
            ref={textInputRef}
            className="bg-black/80 backdrop-blur-lg text-white border border-white/20 rounded-lg px-3 py-2 min-w-[200px] resize-none outline-none focus:border-blue-500"
            style={{ fontSize: Math.min(24, Math.max(12, toolSettings.fontSize / 2)) }}
            placeholder="Text eingeben..."
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleTextSubmit()
              } else if (e.key === 'Escape') {
                setTextInput({ x: 0, y: 0, visible: false })
              }
            }}
            onBlur={handleTextSubmit}
          />
        </div>
      )}
      
      {/* Text edit overlay (for double-click editing) */}
      {textEditState?.visible && (
        <div
          className="fixed z-50"
          style={{ left: textEditState.screenX, top: textEditState.screenY }}
        >
          <textarea
            ref={textEditRef}
            className="bg-black/80 backdrop-blur-lg text-white border border-blue-500 rounded-lg px-3 py-2 min-w-[200px] resize-none outline-none"
            style={{ fontSize: 14 }}
            placeholder="Text bearbeiten..."
            rows={3}
            defaultValue={(() => {
              const obj = objects.get(textEditState.objectId)
              if (!obj) return ''
              return (obj.data as { text?: string }).text || ''
            })()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleTextEditSubmit()
              } else if (e.key === 'Escape') {
                setTextEditState(null)
              }
            }}
            onBlur={handleTextEditSubmit}
          />
        </div>
      )}
      
      {/* Sticky note color picker - shows when a sticky is selected */}
      {(() => {
        const selectedId = Array.from(selectedIds)[0]
        const selectedObj = selectedId ? objects.get(selectedId) : null
        if (selectedObj?.type !== 'sticky') return null
        
        const stickyColors = [
          '#FEF08A', '#BBF7D0', '#FBCFE8', '#DDD6FE',
          '#BAE6FD', '#FED7AA', '#FECACA', '#E5E7EB'
        ]
        const currentColor = (selectedObj.data as { color: string }).color
        
        // Calculate position based on sticky note position
        const stage = stageRef.current
        if (!stage) return null
        const stageBox = stage.container().getBoundingClientRect()
        const screenX = Math.min(
          stageBox.left + (selectedObj.x * viewport.scale) + viewport.x,
          window.innerWidth - 300
        )
        const screenY = Math.max(
          10,
          stageBox.top + (selectedObj.y * viewport.scale) + viewport.y - 50
        )
        
        return (
          <div
            className="fixed z-40 flex items-center gap-1 bg-black/90 backdrop-blur-xl rounded-full px-2 py-1.5 border border-white/20 shadow-xl"
            style={{ left: screenX, top: screenY }}
          >
            <span className="text-white/50 text-xs px-1">Farbe:</span>
            {stickyColors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  updateObject(selectedObj.id, {
                    data: { ...selectedObj.data, color }
                  }, true)
                }}
                className={`w-6 h-6 rounded-full transition-all border-2 ${
                  currentColor === color
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-transparent hover:scale-105 hover:border-white/30'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )
      })()}
      
      {/* Video/Audio overlays - HTML elements positioned over canvas */}
      {Array.from(objects.values())
        .filter((obj) => obj.type === 'video' || obj.type === 'audio')
        .map((obj) => (
          <MediaOverlay
            key={`media-overlay-${obj.id}`}
            obj={obj}
            viewport={viewport}
            stageRef={stageRef}
            isSelected={selectedIds.has(obj.id)}
            onSelect={() => setSelectedIds(new Set([obj.id]))}
            updateObject={updateObject}
            onObjectUpdate={onObjectUpdate}
          />
        ))}
      
      {/* Mobile Context Menu (2-Finger-Tap) */}
      {showMobileContextMenu && (
        <div 
          className="fixed z-[100] animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            left: showMobileContextMenu.x - 100, 
            top: showMobileContextMenu.y - 20 
          }}
        >
          <div className="bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-700/50 p-2 min-w-[200px]">
            <div className="text-xs text-zinc-500 px-3 py-1 mb-1">Tool wechseln</div>
            <div className="grid grid-cols-3 gap-1">
              {(['select', 'pen', 'eraser', 'shape', 'text', 'sticky', 'pan', 'connector', 'laser'] as const).map(tool => {
                const store = useCanvasStore.getState()
                const isActive = store.currentTool === tool
                const toolNames: Record<string, string> = {
                  select: 'Auswahl',
                  pen: 'Stift',
                  eraser: 'Radier.',
                  shape: 'Form',
                  text: 'Text',
                  sticky: 'Notiz',
                  pan: 'Pan',
                  connector: 'Verbind.',
                  laser: 'Laser'
                }
                return (
                  <button
                    key={tool}
                    onClick={() => {
                      useCanvasStore.getState().setTool(tool)
                      setShowMobileContextMenu(null)
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {toolNames[tool]}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setShowMobileContextMenu(null)}
              className="w-full mt-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 transition-colors"
            >
              Schließen
            </button>
          </div>
          {/* Click-away overlay */}
          <div 
            className="fixed inset-0 -z-10"
            onClick={() => setShowMobileContextMenu(null)}
          />
        </div>
      )}
    </div>
  )
}
