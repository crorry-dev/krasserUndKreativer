import { Rect, Text, Group } from 'react-konva'
import { useCanvasStore, WorkspaceRegion as IWorkspaceRegion } from '../../stores/canvasStore'

interface WorkspaceRegionProps {
  region: IWorkspaceRegion
  isSelected?: boolean
  onSelect?: () => void
}

export function WorkspaceRegion({ region, isSelected, onSelect }: WorkspaceRegionProps) {
  const currentUserId = useCanvasStore((s) => s.currentUserId)
  
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
    <Group>
      {/* Region background */}
      <Rect
        x={region.bounds.x1}
        y={region.bounds.y1}
        width={width}
        height={height}
        fill={region.color}
        opacity={fillOpacity}
        stroke={region.color}
        strokeWidth={isSelected ? 3 : 2}
        dash={isSelected ? undefined : [10, 5]}
        cornerRadius={8}
        onClick={onSelect}
        onTap={onSelect}
      />
      
      {/* Region label */}
      <Group x={region.bounds.x1 + 8} y={region.bounds.y1 + 8}>
        {/* Label background */}
        <Rect
          x={0}
          y={0}
          width={region.name.length * 8 + 24}
          height={28}
          fill={region.color}
          opacity={0.9}
          cornerRadius={4}
        />
        
        {/* Permission indicator */}
        <Text
          x={6}
          y={6}
          text={canEdit ? 'E' : isViewer ? 'V' : 'X'}
          fontSize={12}
        />
        
        {/* Region name */}
        <Text
          x={24}
          y={7}
          text={region.name}
          fontSize={12}
          fill="#ffffff"
          fontStyle="bold"
        />
      </Group>
      
      {/* Lock indicator if locked */}
      {region.isLocked && (
        <Group x={region.bounds.x2 - 32} y={region.bounds.y1 + 8}>
          <Rect
            x={0}
            y={0}
            width={24}
            height={24}
            fill="rgba(0,0,0,0.5)"
            cornerRadius={4}
          />
          <Text
            x={5}
            y={5}
            text="L"
            fontSize={12}
          />
        </Group>
      )}
    </Group>
  )
}
