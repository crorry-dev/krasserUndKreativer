import { Circle, Group } from 'react-konva'
import { AnchorPosition, CanvasObject } from '../../stores/canvasStore'

interface AnchorPointsProps {
  object: CanvasObject
  scale: number
  onAnchorClick?: (position: AnchorPosition) => void
  onAnchorHover?: (position: AnchorPosition | null) => void
  isConnecting?: boolean
  hoveredAnchor?: AnchorPosition | null
}

/**
 * Zeigt 4 Ankerpunkte (oben, rechts, unten, links) + 1 Zentrum
 * für Connector-Verbindungen auf einem Objekt an
 */
export function AnchorPoints({
  object,
  scale,
  onAnchorClick,
  onAnchorHover,
  isConnecting = false,
  hoveredAnchor = null,
}: AnchorPointsProps) {
  const anchorSize = 8 / scale // Größe skaliert mit Zoom
  const hitSize = 16 / scale  // Größerer Klickbereich
  
  const centerX = object.x + object.width / 2
  const centerY = object.y + object.height / 2
  
  // Ankerpunkt-Positionen
  const anchors: { position: AnchorPosition; x: number; y: number }[] = [
    { position: 'top', x: centerX, y: object.y },
    { position: 'right', x: object.x + object.width, y: centerY },
    { position: 'bottom', x: centerX, y: object.y + object.height },
    { position: 'left', x: object.x, y: centerY },
    { position: 'center', x: centerX, y: centerY },
  ]

  return (
    <Group>
      {anchors.map(({ position, x, y }) => {
        const isHovered = hoveredAnchor === position
        const isCenter = position === 'center'
        
        return (
          <Group key={position}>
            {/* Unsichtbarer größerer Klickbereich */}
            <Circle
              x={x}
              y={y}
              radius={hitSize}
              fill="transparent"
              onClick={() => onAnchorClick?.(position)}
              onTap={() => onAnchorClick?.(position)}
              onMouseEnter={() => onAnchorHover?.(position)}
              onMouseLeave={() => onAnchorHover?.(null)}
              style={{ cursor: 'crosshair' }}
            />
            
            {/* Äußerer Ring (Glow-Effekt bei Hover) */}
            {(isHovered || isConnecting) && (
              <Circle
                x={x}
                y={y}
                radius={anchorSize * 1.8}
                fill="transparent"
                stroke={isHovered ? '#3B82F6' : '#60A5FA'}
                strokeWidth={2 / scale}
                opacity={isHovered ? 0.8 : 0.4}
              />
            )}
            
            {/* Hauptpunkt */}
            <Circle
              x={x}
              y={y}
              radius={isCenter ? anchorSize * 0.8 : anchorSize}
              fill={isHovered ? '#3B82F6' : isCenter ? '#8B5CF6' : '#60A5FA'}
              stroke="white"
              strokeWidth={2 / scale}
              shadowColor="black"
              shadowBlur={4 / scale}
              shadowOpacity={0.3}
            />
            
            {/* Innerer Punkt für Center-Anchor */}
            {isCenter && (
              <Circle
                x={x}
                y={y}
                radius={anchorSize * 0.3}
                fill="white"
              />
            )}
          </Group>
        )
      })}
    </Group>
  )
}

/**
 * Temporäre Linie während Connector erstellt wird
 */
interface PendingConnectorLineProps {
  startX: number
  startY: number
  endX: number
  endY: number
  scale: number
}

export function PendingConnectorLine({
  startX,
  startY,
  endX,
  endY,
  scale,
}: PendingConnectorLineProps) {
  return (
    <Group>
      {/* Gestrichelte Linie */}
      <Circle
        x={startX}
        y={startY}
        radius={6 / scale}
        fill="#3B82F6"
        stroke="white"
        strokeWidth={2 / scale}
      />
      
      {/* Linie mit Dash-Pattern */}
      {/* Da Konva Line kein direktes Dash unterstützt, verwenden wir eine normale Linie */}
      <Circle
        x={endX}
        y={endY}
        radius={4 / scale}
        fill="#3B82F6"
        opacity={0.6}
      />
    </Group>
  )
}

export default AnchorPoints
