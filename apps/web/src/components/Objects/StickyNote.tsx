import { Group, Rect, Text, Transformer } from 'react-konva'
import { useRef, useState, useEffect } from 'react'
import Konva from 'konva'

interface StickyNoteProps {
  id: string
  x: number
  y: number
  width?: number
  height?: number
  text: string
  color?: string
  fontSize?: number
  isSelected?: boolean
  onSelect?: () => void
  onChange?: (changes: Partial<StickyNoteProps>) => void
  onTextChange?: (text: string) => void
}

// Sticky note color palette
const STICKY_COLORS = [
  '#FEF08A', // Yellow
  '#BBF7D0', // Green  
  '#FBCFE8', // Pink
  '#DDD6FE', // Purple
  '#BAE6FD', // Blue
  '#FED7AA', // Orange
  '#FECACA', // Red
  '#E5E7EB', // Gray
]

// Get contrasting text color
const getTextColor = (_bgColor: string): string => {
  // For light sticky colors, use dark text
  return '#1F2937'
}

// Get slightly darker shade for fold effect
const getDarkerShade = (color: string): string => {
  const match = color.replace(/^#/, '').match(/.{2}/g)
  if (!match) return color
  const darker = match.map(c => Math.max(0, parseInt(c, 16) - 30).toString(16).padStart(2, '0')).join('')
  return `#${darker}`
}

export function StickyNote({
  id: _id,
  x,
  y,
  width = 200,
  height = 150,
  text,
  color = '#FEF08A',
  fontSize = 14,
  isSelected = false,
  onSelect,
  onChange,
  onTextChange,
}: StickyNoteProps) {
  const groupRef = useRef<Konva.Group>(null)
  const rectRef = useRef<Konva.Rect>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Update transformer when selection changes
  useEffect(() => {
    if (isSelected && transformerRef.current && groupRef.current) {
      transformerRef.current.nodes([groupRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])
  
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange?.({
      x: e.target.x(),
      y: e.target.y(),
    })
  }
  
  const handleTransformEnd = () => {
    const node = groupRef.current
    if (!node) return
    
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    
    // Reset scale and apply to width/height
    node.scaleX(1)
    node.scaleY(1)
    
    const newWidth = Math.max(100, width * scaleX)
    const newHeight = Math.max(80, height * scaleY)
    
    onChange?.({
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
    })
  }
  
  const handleDoubleClick = () => {
    setIsEditing(true)
    
    // Create textarea for editing
    const stage = groupRef.current?.getStage()
    if (!stage) return
    
    const stageBox = stage.container().getBoundingClientRect()
    const absPos = groupRef.current!.absolutePosition()
    const scale = stage.scaleX()
    
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    
    textarea.value = text
    textarea.style.position = 'absolute'
    textarea.style.top = `${stageBox.top + absPos.y * scale + 12 * scale}px`
    textarea.style.left = `${stageBox.left + absPos.x * scale + 12 * scale}px`
    textarea.style.width = `${(width - 24) * scale}px`
    textarea.style.height = `${(height - 24) * scale}px`
    textarea.style.fontSize = `${fontSize * scale}px`
    textarea.style.lineHeight = '1.4'
    textarea.style.border = 'none'
    textarea.style.padding = '0'
    textarea.style.margin = '0'
    textarea.style.overflow = 'hidden'
    textarea.style.background = 'transparent'
    textarea.style.outline = 'none'
    textarea.style.resize = 'none'
    textarea.style.fontFamily = 'Inter, system-ui, sans-serif'
    textarea.style.color = getTextColor(color)
    textarea.style.transformOrigin = 'left top'
    textarea.style.zIndex = '1000'
    
    textarea.focus()
    textarea.select()
    
    const handleBlur = () => {
      onTextChange?.(textarea.value)
      if (document.body.contains(textarea)) {
        document.body.removeChild(textarea)
      }
      setIsEditing(false)
    }
    
    textarea.addEventListener('blur', handleBlur)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        textarea.blur()
      }
      // Allow Enter for new lines (don't blur)
    })
  }
  
  const textColor = getTextColor(color)
  const foldColor = getDarkerShade(color)
  
  return (
    <>
      <Group
        ref={groupRef}
        x={x}
        y={y}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {/* Shadow */}
        <Rect
          x={3}
          y={3}
          width={width}
          height={height}
          fill="rgba(0,0,0,0.15)"
          cornerRadius={4}
        />
        
        {/* Main background */}
        <Rect
          ref={rectRef}
          width={width}
          height={height}
          fill={color}
          cornerRadius={4}
          stroke={isSelected ? '#4F46E5' : 'rgba(0,0,0,0.1)'}
          strokeWidth={isSelected ? 3 : 1}
        />
        
        {/* Fold effect - top right corner */}
        <Rect
          x={width - 20}
          y={0}
          width={20}
          height={20}
          fill={foldColor}
        />
        
        {/* Text content */}
        {!isEditing && (
          <Text
            x={12}
            y={12}
            width={width - 24}
            height={height - 24}
            text={text || ''}
            fontSize={fontSize}
            fontFamily="Inter, system-ui, sans-serif"
            fill={textColor}
            wrap="word"
            align="left"
            verticalAlign="top"
            lineHeight={1.4}
          />
        )}
        
        {/* Placeholder if empty */}
        {!text && !isEditing && (
          <Text
            x={12}
            y={12}
            width={width - 24}
            text="Doppelklick zum Schreiben..."
            fontSize={fontSize}
            fontFamily="Inter, system-ui, sans-serif"
            fill="rgba(0,0,0,0.3)"
          />
        )}
      </Group>
      
      {/* Transformer for resizing */}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // Minimum size
            if (newBox.width < 100 || newBox.height < 80) {
              return oldBox
            }
            return newBox
          }}
          anchorSize={10}
          anchorCornerRadius={5}
          anchorFill="#4F46E5"
          anchorStroke="#fff"
          anchorStrokeWidth={2}
          borderStroke="#4F46E5"
          borderStrokeWidth={2}
          borderDash={[]}
        />
      )}
    </>
  )
}

export { STICKY_COLORS }
