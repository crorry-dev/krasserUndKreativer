import { useRef, useEffect, useCallback, useState } from 'react'
import { Stage, Layer, Line, Circle, Rect, Text, Arrow, RegularPolygon } from 'react-konva'
import { useGesture } from '@use-gesture/react'
import Konva from 'konva'
import { useCanvasStore, CanvasObject, ShapeType } from '@/stores/canvasStore'

const MIN_SCALE = 0.0001 // Extrem weit rauszoomen möglich (0.01% = sieht gesamtes Universum)
// MAX_SCALE entfernt - unendliches Reinzoomen möglich (bis auf Atomebene und darüber hinaus)

interface InfiniteCanvasProps {
  onCursorMove?: (x: number, y: number) => void
  onObjectCreate?: (object: CanvasObject) => void
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
interface DragState {
  objectId: string
  startCanvasPos: { x: number; y: number }
  objectStartPos: { x: number; y: number }
}

// Text edit state
interface TextEditState {
  objectId: string
  screenX: number
  screenY: number
  visible: boolean
}

export function InfiniteCanvas({ onCursorMove, onObjectCreate }: InfiniteCanvasProps) {
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
  } = useCanvasStore()
  
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
  
  // Gesture handling for pan and zoom
  useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching, event }) => {
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
  
  // State for right-click panning
  const [isRightClickPanning, setIsRightClickPanning] = useState(false)
  const [lastPanPos, setLastPanPos] = useState<{ x: number; y: number } | null>(null)
  
  // Drawing handlers
  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage()
    const pos = stage?.getPointerPosition()
    if (!pos) return
    
    const canvasPos = screenToCanvas(pos.x, pos.y)
    
    // Rechtsklick = Pan (funktioniert mit jedem Tool)
    if (e.evt.button === 2) {
      e.evt.preventDefault()
      setIsRightClickPanning(true)
      setLastPanPos({ x: pos.x, y: pos.y })
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
      // Create sticky note at position
      const id = `sticky-${Date.now()}`
      const newObject: CanvasObject = {
        id,
        type: 'sticky',
        x: canvasPos.x,
        y: canvasPos.y,
        width: 200,
        height: 150,
        data: { text: '', color: '#fef08a' },
        createdAt: Date.now(),
      }
      addObject(newObject)
      onObjectCreate?.(newObject)
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
    } else if (currentTool === 'select') {
      // Check if clicked on an object
      const clickedObject = findObjectAtPosition(canvasPos)
      const now = Date.now()
      
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
        
        // Select the object
        setSelectedIds(new Set([clickedObject.id]))
        
        // Start dragging
        setDragState({
          objectId: clickedObject.id,
          startCanvasPos: canvasPos,
          objectStartPos: { x: clickedObject.x, y: clickedObject.y },
        })
      } else {
        setSelectedIds(new Set())
        lastClickedObject.current = null
      }
    }
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
    
    // Handle dragging objects with select tool
    if (currentTool === 'select' && dragState) {
      const dx = canvasPos.x - dragState.startCanvasPos.x
      const dy = canvasPos.y - dragState.startCanvasPos.y
      
      const newX = dragState.objectStartPos.x + dx
      const newY = dragState.objectStartPos.y + dy
      
      // Update object position live
      updateObject(dragState.objectId, { x: newX, y: newY })
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
  }
  
  const handlePointerUp = () => {
    // Beende Rechtsklick-Pan
    if (isRightClickPanning) {
      setIsRightClickPanning(false)
      setLastPanPos(null)
      return
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
  
  // Zoom-Level Anzeige Farbe berechnen
  const getZoomIndicatorColor = () => {
    const scale = viewport.scale
    if (scale <= 1) return '#4ade80' // Grün
    if (scale <= 10) return '#a3e635' // Hellgrün
    if (scale <= 50) return '#facc15' // Gelb
    if (scale <= 200) return '#fb923c' // Orange
    if (scale <= 1000) return '#f87171' // Hellrot
    if (scale <= 10000) return '#ef4444' // Rot
    return '#dc2626' // Dunkelrot - Pixelbereich
  }
  
  // Format zoom display
  const formatZoom = () => {
    const scale = viewport.scale
    if (scale >= 1000000) return `${(scale / 1000000).toFixed(1)}M%`
    if (scale >= 1000) return `${(scale / 1000).toFixed(1)}k%`
    if (scale >= 10) return `${Math.round(scale * 100)}%`
    return `${(scale * 100).toFixed(1)}%`
  }
  
  // Berechne sichtbare Größe eines "Pixels" in echter Bildschirmgröße
  const getPixelSizeInfo = () => {
    const pixelSize = viewport.scale // 1 Canvas-Einheit = X Pixel auf Screen
    if (pixelSize >= 1) {
      return `1 Einheit = ${pixelSize.toFixed(pixelSize > 10 ? 0 : 1)}px`
    }
    return `${(1/pixelSize).toFixed(0)} Einheiten = 1px`
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
        elements.push(
          <Rect
            key={`${obj.id}-bg`}
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
            fill={color}
            cornerRadius={4}
            shadowColor="black"
            shadowBlur={10}
            shadowOpacity={0.3}
            shadowOffset={{ x: 2, y: 2 }}
          />
        )
        elements.push(
          <Text
            key={`${obj.id}-text`}
            x={obj.x + 8}
            y={obj.y + 8}
            text={text || 'Klicken zum Bearbeiten'}
            fontSize={14}
            fontFamily="Inter, system-ui, sans-serif"
            fill="#1a1a1a"
            width={obj.width - 16}
          />
        )
      }
      
      // Selection indicator
      if (isSelected) {
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
        <Layer>
          {renderObjects()}
          {renderCurrentStroke()}
          {renderShapePreview()}
        </Layer>
        <Layer>
          {/* Origin marker */}
          <Circle x={0} y={0} radius={5} fill="#4ade80" />
          {renderEraserCursor()}
          {renderPenCursor()}
        </Layer>
      </Stage>
      
      {/* Coordinates & Zoom display - TOP LEFT */}
      <div className="absolute top-4 left-4 text-xs font-mono space-y-1 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
        <div className="text-white/70">
          <span className="text-white/40">x:</span> {Math.round(-viewport.x / viewport.scale)} <span className="text-white/30">|</span> <span className="text-white/40">y:</span> {Math.round(-viewport.y / viewport.scale)}
        </div>
        <div 
          className="font-semibold transition-colors duration-300"
          style={{ color: getZoomIndicatorColor() }}
        >
          <span className="text-white/40">zoom:</span> {formatZoom()}
        </div>
        <div className="text-white/30 text-[10px]">
          {getPixelSizeInfo()}
        </div>
      </div>
      
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
    </div>
  )
}
