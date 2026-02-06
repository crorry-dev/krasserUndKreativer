import { Group, Rect, Text } from 'react-konva'
import { useRef, useState } from 'react'
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

const STICKY_COLORS = [
  '#FEF08A', // Yellow
  '#BBF7D0', // Green
  '#FBCFE8', // Pink
  '#DDD6FE', // Purple
  '#BAE6FD', // Blue
  '#FED7AA', // Orange
]

export function StickyNote({
  id: _id,
  x,
  y,
  width = 200,
  height = 150,
  text,
  color = '#FEF08A',
  fontSize = 16,
  isSelected = false,
  onSelect,
  onChange,
  onTextChange,
}: StickyNoteProps) {
  const groupRef = useRef<Konva.Group>(null)
  const textRef = useRef<Konva.Text>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange?.({
      x: e.target.x(),
      y: e.target.y(),
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
    textarea.style.top = `${stageBox.top + absPos.y * scale + 10}px`
    textarea.style.left = `${stageBox.left + absPos.x * scale + 10}px`
    textarea.style.width = `${(width - 20) * scale}px`
    textarea.style.height = `${(height - 20) * scale}px`
    textarea.style.fontSize = `${fontSize * scale}px`
    textarea.style.border = 'none'
    textarea.style.padding = '4px'
    textarea.style.margin = '0'
    textarea.style.overflow = 'hidden'
    textarea.style.background = color
    textarea.style.outline = 'none'
    textarea.style.resize = 'none'
    textarea.style.fontFamily = 'inherit'
    textarea.style.transformOrigin = 'left top'
    textarea.style.zIndex = '1000'
    
    textarea.focus()
    
    const handleBlur = () => {
      onTextChange?.(textarea.value)
      document.body.removeChild(textarea)
      setIsEditing(false)
    }
    
    textarea.addEventListener('blur', handleBlur)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        textarea.blur()
      }
    })
  }
  
  return (
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
    >
      {/* Shadow */}
      <Rect
        x={4}
        y={4}
        width={width}
        height={height}
        fill="rgba(0,0,0,0.1)"
        cornerRadius={4}
      />
      
      {/* Main background */}
      <Rect
        width={width}
        height={height}
        fill={color}
        cornerRadius={4}
        stroke={isSelected ? '#4F46E5' : 'rgba(0,0,0,0.1)'}
        strokeWidth={isSelected ? 2 : 1}
      />
      
      {/* Fold effect */}
      <Rect
        x={width - 20}
        y={0}
        width={20}
        height={20}
        fill="rgba(0,0,0,0.05)"
      />
      
      {/* Text */}
      {!isEditing && (
        <Text
          ref={textRef}
          x={10}
          y={10}
          width={width - 20}
          height={height - 20}
          text={text}
          fontSize={fontSize}
          fontFamily="Inter, sans-serif"
          fill="#1F2937"
          wrap="word"
          align="left"
          verticalAlign="top"
        />
      )}
      
      {/* Placeholder if empty */}
      {!text && !isEditing && (
        <Text
          x={10}
          y={10}
          width={width - 20}
          text="Doppelklick zum Schreiben..."
          fontSize={14}
          fontFamily="Inter, sans-serif"
          fill="#9CA3AF"
        />
      )}
    </Group>
  )
}

export { STICKY_COLORS }
