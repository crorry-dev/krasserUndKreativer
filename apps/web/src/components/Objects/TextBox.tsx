import { Text, Transformer } from 'react-konva'
import { useRef, useEffect, useState } from 'react'
import Konva from 'konva'

interface TextBoxProps {
  id: string
  x: number
  y: number
  text: string
  fontSize?: number
  fontFamily?: string
  fill?: string
  width?: number
  isSelected?: boolean
  onSelect?: () => void
  onChange?: (changes: Partial<TextBoxProps>) => void
  onTextChange?: (text: string) => void
}

export function TextBox({
  id: _id,
  x,
  y,
  text,
  fontSize = 20,
  fontFamily = 'Inter, sans-serif',
  fill = '#FFFFFF',
  width = 300,
  isSelected = false,
  onSelect,
  onChange,
  onTextChange,
}: TextBoxProps) {
  const textRef = useRef<Konva.Text>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  useEffect(() => {
    if (isSelected && transformerRef.current && textRef.current) {
      transformerRef.current.nodes([textRef.current])
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
    const node = textRef.current
    if (!node) return
    
    const scaleX = node.scaleX()
    
    // Reset scale and adjust width
    node.scaleX(1)
    node.scaleY(1)
    
    onChange?.({
      x: node.x(),
      y: node.y(),
      width: Math.max(50, node.width() * scaleX),
    })
  }
  
  const handleDoubleClick = () => {
    setIsEditing(true)
    
    const node = textRef.current
    const stage = node?.getStage()
    if (!node || !stage) return
    
    const stageBox = stage.container().getBoundingClientRect()
    const absPos = node.absolutePosition()
    const scale = stage.scaleX()
    
    // Create input for editing
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    
    textarea.value = text
    textarea.style.position = 'absolute'
    textarea.style.top = `${stageBox.top + absPos.y * scale}px`
    textarea.style.left = `${stageBox.left + absPos.x * scale}px`
    textarea.style.width = `${width * scale}px`
    textarea.style.height = 'auto'
    textarea.style.fontSize = `${fontSize * scale}px`
    textarea.style.fontFamily = fontFamily
    textarea.style.border = 'none'
    textarea.style.padding = '0'
    textarea.style.margin = '0'
    textarea.style.overflow = 'hidden'
    textarea.style.background = 'none'
    textarea.style.outline = 'none'
    textarea.style.resize = 'none'
    textarea.style.color = fill
    textarea.style.transformOrigin = 'left top'
    textarea.style.zIndex = '1000'
    textarea.style.lineHeight = '1.2'
    
    textarea.focus()
    
    // Auto-resize
    const autoResize = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
    
    autoResize()
    textarea.addEventListener('input', autoResize)
    
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
    <>
      <Text
        ref={textRef}
        x={x}
        y={y}
        text={text || 'Doppelklick zum Schreiben...'}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fill={text ? fill : '#6B7280'}
        width={width}
        wrap="word"
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        visible={!isEditing}
      />
      {isSelected && !isEditing && (
        <Transformer
          ref={transformerRef}
          enabledAnchors={['middle-left', 'middle-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 50) {
              return oldBox
            }
            return newBox
          }}
        />
      )}
    </>
  )
}
