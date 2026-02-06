import { Rect, Circle, RegularPolygon, Line, Arrow, Transformer } from 'react-konva'
import { useRef, useEffect } from 'react'
import Konva from 'konva'

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'arrow' | 'line'

interface ShapeProps {
  id: string
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  rotation?: number
  isSelected?: boolean
  onSelect?: () => void
  onChange?: (changes: Partial<ShapeProps>) => void
}

export function Shape({
  id: _id,
  type,
  x,
  y,
  width,
  height,
  fill = '#4F46E5',
  stroke = '#312E81',
  strokeWidth = 2,
  rotation = 0,
  isSelected = false,
  onSelect,
  onChange,
}: ShapeProps) {
  const shapeRef = useRef<Konva.Rect>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current])
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
    const node = shapeRef.current
    if (!node) return
    
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    
    // Reset scale and adjust size
    node.scaleX(1)
    node.scaleY(1)
    
    onChange?.({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    })
  }
  
  const commonProps = {
    x,
    y,
    rotation,
    fill,
    stroke,
    strokeWidth,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
  }
  
  const renderShape = () => {
    switch (type) {
      case 'rectangle':
        return (
          <Rect
            ref={shapeRef}
            {...commonProps}
            width={width}
            height={height}
            cornerRadius={4}
          />
        )
      
      case 'circle':
        return (
          <Circle
            {...commonProps}
            x={x + width / 2}
            y={y + height / 2}
            radius={Math.min(width, height) / 2}
          />
        )
      
      case 'triangle':
        return (
          <RegularPolygon
            {...commonProps}
            x={x + width / 2}
            y={y + height / 2}
            sides={3}
            radius={Math.min(width, height) / 2}
          />
        )
      
      case 'diamond':
        return (
          <RegularPolygon
            {...commonProps}
            x={x + width / 2}
            y={y + height / 2}
            sides={4}
            radius={Math.min(width, height) / 2}
          />
        )
      
      case 'arrow':
        return (
          <Arrow
            {...commonProps}
            points={[0, height / 2, width, height / 2]}
            pointerLength={20}
            pointerWidth={20}
          />
        )
      
      case 'line':
        return (
          <Line
            {...commonProps}
            points={[0, 0, width, height]}
          />
        )
      
      default:
        return null
    }
  }
  
  return (
    <>
      {renderShape()}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox
            }
            return newBox
          }}
        />
      )}
    </>
  )
}
