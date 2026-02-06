import { Arrow, Line, Circle } from 'react-konva'
import { useMemo } from 'react'

export type ConnectorType = 'straight' | 'curved' | 'elbow'

interface Point {
  x: number
  y: number
}

interface ConnectorProps {
  id: string
  from: Point
  to: Point
  type?: ConnectorType
  color?: string
  strokeWidth?: number
  hasArrow?: boolean
  isSelected?: boolean
  onSelect?: () => void
}

export function Connector({
  id: _id,
  from,
  to,
  type = 'curved',
  color = '#6366F1',
  strokeWidth = 2,
  hasArrow = true,
  isSelected = false,
  onSelect,
}: ConnectorProps) {
  
  // Calculate control points for curved lines
  const points = useMemo(() => {
    const dx = to.x - from.x
    
    switch (type) {
      case 'straight':
        return [from.x, from.y, to.x, to.y]
      
      case 'curved': {
        // Bezier curve control points
        const midX = from.x + dx / 2
        const ctrl1 = { x: midX, y: from.y }
        const ctrl2 = { x: midX, y: to.y }
        
        // For Konva Line with tension
        return [
          from.x, from.y,
          ctrl1.x, ctrl1.y,
          ctrl2.x, ctrl2.y,
          to.x, to.y,
        ]
      }
      
      case 'elbow': {
        // Right-angle connector
        const midX = from.x + dx / 2
        return [
          from.x, from.y,
          midX, from.y,
          midX, to.y,
          to.x, to.y,
        ]
      }
      
      default:
        return [from.x, from.y, to.x, to.y]
    }
  }, [from, to, type])
  
  if (hasArrow && type === 'straight') {
    return (
      <Arrow
        points={points}
        stroke={color}
        strokeWidth={strokeWidth}
        fill={color}
        pointerLength={10}
        pointerWidth={10}
        onClick={onSelect}
        onTap={onSelect}
        hitStrokeWidth={10}
      />
    )
  }
  
  return (
    <>
      <Line
        points={points}
        stroke={isSelected ? '#4F46E5' : color}
        strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
        tension={type === 'curved' ? 0.5 : 0}
        lineCap="round"
        lineJoin="round"
        onClick={onSelect}
        onTap={onSelect}
        hitStrokeWidth={10}
      />
      
      {/* Arrow head for non-straight lines */}
      {hasArrow && (
        <>
          {/* Arrow head approximation with circles */}
          <Circle
            x={to.x}
            y={to.y}
            radius={5}
            fill={color}
          />
        </>
      )}
      
      {/* Connection point indicators when selected */}
      {isSelected && (
        <>
          <Circle
            x={from.x}
            y={from.y}
            radius={6}
            fill="white"
            stroke="#4F46E5"
            strokeWidth={2}
          />
          <Circle
            x={to.x}
            y={to.y}
            radius={6}
            fill="white"
            stroke="#4F46E5"
            strokeWidth={2}
          />
        </>
      )}
    </>
  )
}


// Utility to calculate connection point on a shape edge
export function getConnectionPoint(
  shape: { x: number; y: number; width: number; height: number },
  side: 'top' | 'right' | 'bottom' | 'left' | 'center'
): Point {
  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2
  
  switch (side) {
    case 'top':
      return { x: cx, y: shape.y }
    case 'right':
      return { x: shape.x + shape.width, y: cy }
    case 'bottom':
      return { x: cx, y: shape.y + shape.height }
    case 'left':
      return { x: shape.x, y: cy }
    case 'center':
    default:
      return { x: cx, y: cy }
  }
}


// Auto-detect best connection points between two shapes
export function getAutoConnectionPoints(
  from: { x: number; y: number; width: number; height: number },
  to: { x: number; y: number; width: number; height: number }
): { from: Point; to: Point } {
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
  
  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y
  
  // Determine dominant direction
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      return {
        from: getConnectionPoint(from, 'right'),
        to: getConnectionPoint(to, 'left'),
      }
    } else {
      return {
        from: getConnectionPoint(from, 'left'),
        to: getConnectionPoint(to, 'right'),
      }
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      return {
        from: getConnectionPoint(from, 'bottom'),
        to: getConnectionPoint(to, 'top'),
      }
    } else {
      return {
        from: getConnectionPoint(from, 'top'),
        to: getConnectionPoint(to, 'bottom'),
      }
    }
  }
}
