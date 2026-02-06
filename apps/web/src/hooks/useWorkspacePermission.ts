import { useCallback } from 'react'
import { useCanvasStore, WorkspaceRegion } from '../stores/canvasStore'

/**
 * Hook für Berechtigungsprüfung in Workspace-Regionen
 * Prüft ob der aktuelle User an einer bestimmten Position bearbeiten darf
 */
export function useWorkspacePermission() {
  const workspaceRegions = useCanvasStore((s) => s.workspaceRegions)
  const currentUserId = useCanvasStore((s) => s.currentUserId)
  const canEditAtStore = useCanvasStore((s) => s.canEditAt)
  const getRegionAtStore = useCanvasStore((s) => s.getRegionAt)
  
  /**
   * Prüft ob an einer bestimmten Position bearbeitet werden darf
   */
  const canEditAt = useCallback((x: number, y: number): boolean => {
    return canEditAtStore(x, y)
  }, [canEditAtStore])
  
  /**
   * Findet die Region an einer bestimmten Position
   */
  const getRegionAt = useCallback((x: number, y: number): WorkspaceRegion | null => {
    return getRegionAtStore(x, y)
  }, [getRegionAtStore])
  
  /**
   * Prüft ob ein Objekt bearbeitet werden darf (basierend auf seiner Position)
   */
  const canEditObject = useCallback((objectX: number, objectY: number, objectWidth: number, objectHeight: number): boolean => {
    // Prüfe alle vier Ecken des Objekts
    const corners = [
      { x: objectX, y: objectY },
      { x: objectX + objectWidth, y: objectY },
      { x: objectX, y: objectY + objectHeight },
      { x: objectX + objectWidth, y: objectY + objectHeight },
    ]
    
    // Objekt kann bearbeitet werden wenn mindestens eine Ecke bearbeitet werden darf
    return corners.some(corner => canEditAt(corner.x, corner.y))
  }, [canEditAt])
  
  /**
   * Gibt alle Regionen zurück, in denen der User Bearbeiter ist
   */
  const getEditableRegions = useCallback((): WorkspaceRegion[] => {
    return workspaceRegions.filter((region) => {
      const perm = region.permissions.find((p) => p.userId === currentUserId || p.userId === '*')
      return perm?.role === 'editor'
    })
  }, [workspaceRegions, currentUserId])
  
  /**
   * Gibt alle Regionen zurück, in denen der User Betrachter ist
   */
  const getViewOnlyRegions = useCallback((): WorkspaceRegion[] => {
    return workspaceRegions.filter((region) => {
      const perm = region.permissions.find((p) => p.userId === currentUserId || p.userId === '*')
      return perm?.role === 'viewer'
    })
  }, [workspaceRegions, currentUserId])
  
  /**
   * Gibt die Berechtigung des Users für eine bestimmte Region zurück
   */
  const getPermissionForRegion = useCallback((regionId: string): 'editor' | 'viewer' | 'none' | null => {
    const region = workspaceRegions.find((r) => r.id === regionId)
    if (!region) return null
    
    const perm = region.permissions.find((p) => p.userId === currentUserId || p.userId === '*')
    return perm?.role ?? 'none'
  }, [workspaceRegions, currentUserId])
  
  /**
   * Prüft ob Regionen definiert sind (wenn nicht, gibt es keine Einschränkungen)
   */
  const hasRegions = workspaceRegions.length > 0
  
  return {
    canEditAt,
    getRegionAt,
    canEditObject,
    getEditableRegions,
    getViewOnlyRegions,
    getPermissionForRegion,
    hasRegions,
    regions: workspaceRegions,
  }
}
