import { create } from 'zustand'

// Tool types - extended for Phase 3
export type Tool = 'select' | 'pen' | 'eraser' | 'shape' | 'text' | 'sticky' | 'pan' | 'connector' | 'laser'
export type ShapeType = 'rect' | 'circle' | 'triangle' | 'line' | 'arrow' | 'diamond'
export type ConnectorLineType = 'straight' | 'curved' | 'elbow'
export type ConnectorArrowType = 'none' | 'arrow' | 'dot' | 'diamond'

// Tool Hotbar Mapping (keys 1-9, 0)
export const TOOL_HOTBAR: Tool[] = [
  'select',    // 1
  'pen',       // 2
  'eraser',    // 3
  'shape',     // 4
  'text',      // 5
  'sticky',    // 6
  'connector', // 7
  'pan',       // 8
  'laser',     // 9
  // 0 is reserved for quick-access (last used tool)
]

// Anchor point positions on objects
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left' | 'center'

export interface ConnectorAnchor {
  objectId: string
  position: AnchorPosition
}

export interface Waypoint {
  id: string
  name: string
  x: number
  y: number
  scale: number
  createdAt: number
}

export interface CanvasObject {
  id: string
  type: 'stroke' | 'shape' | 'text' | 'sticky' | 'image' | 'video' | 'audio' | 'connector'
  x: number
  y: number
  width: number
  height: number
  data: Record<string, unknown>
  createdAt: number
}

// Connector-specific data structure (stored in CanvasObject.data)
export interface ConnectorData {
  sourceAnchor: ConnectorAnchor
  targetAnchor: ConnectorAnchor
  lineType: ConnectorLineType
  startArrow: ConnectorArrowType
  endArrow: ConnectorArrowType
  stroke: string
  strokeWidth: number
  // Computed path points (updated when connected objects move)
  points: number[]
}

export interface ViewportState {
  x: number
  y: number
  scale: number
}

// Tool settings
export interface ToolSettings {
  strokeWidth: number      // Stiftdicke (0.001 - unendlich)
  eraserWidth: number      // Radierer-Größe (0.1 - unendlich)
  fontSize: number         // Textgröße (0.1 - unendlich)
  shapeStrokeWidth: number // Form-Liniendicke (0.001 - unendlich)
  shapeType: ShapeType     // Aktuelle Form
  color: string            // Aktuelle Farbe
  fillColor: string        // Füllfarbe für Formen
  stickyColor: string      // Notiz-Farbe
  // Connector settings
  connectorLineType: ConnectorLineType
  connectorStartArrow: ConnectorArrowType
  connectorEndArrow: ConnectorArrowType
}

// Laser pointer state (shared via WebSocket for collaboration)
export interface LaserState {
  isActive: boolean
  isPressed: boolean  // Nur aktiv wenn Maus gedrückt
  x: number
  y: number
  trail: { x: number; y: number; timestamp: number }[]
  // Einstellungen
  color: string
  size: number  // 1-5
}

// ============= Phase 4: Workspace Regions =============
export interface WorkspacePermission {
  userId: string | '*'  // '*' = alle
  role: 'editor' | 'viewer' | 'none'
}

export interface WorkspaceRegion {
  id: string
  name: string
  color: string                    // Umrandungsfarbe
  bounds: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
  permissions: WorkspacePermission[]
  createdBy: string
  createdAt: number
  isLocked: boolean               // Bereich fixiert
  obscureNoAccess: boolean        // Bereich für Nutzer ohne Zugriff verpixeln
}

// ============= Phase 4: Presenter Mode =============
export interface Viewport {
  x: number
  y: number
  scale: number
}

export interface PresenterInfo {
  id: string
  name: string
}

export interface PresenterState {
  isPresenting: boolean
  isFollowing: boolean
  presenter: PresenterInfo | null
  followerIds: Set<string>
  presenterViewport: Viewport | null
  // Einladungs-System
  invitePending: boolean      // Zeigt an, ob eine Einladung angezeigt werden soll
  inviteDeclined: boolean     // User hat die Einladung abgelehnt
}

// History action types
export interface HistoryAction {
  type: 'add' | 'update' | 'delete' | 'multi'
  objectId?: string
  objects?: CanvasObject[]  // For multi actions
  previousState?: CanvasObject
  newState?: CanvasObject
  deletedObjects?: CanvasObject[]  // For multi-delete (eraser)
  createdObjects?: CanvasObject[]  // For multi-create (split strokes)
  // Metadata
  timestamp: number  // Unix timestamp
  userId: string     // UUID des Users (bleibt konstant auch bei Namensänderung)
}

interface CanvasState {
  // Viewport
  viewport: ViewportState
  setViewport: (viewport: Partial<ViewportState>) => void
  
  // Tool
  currentTool: Tool
  setTool: (tool: Tool) => void
  
  // Tool settings
  toolSettings: ToolSettings
  setToolSettings: (settings: Partial<ToolSettings>) => void
  
  // Objects
  objects: Map<string, CanvasObject>
  addObject: (obj: CanvasObject, recordHistory?: boolean) => void
  updateObject: (id: string, changes: Partial<CanvasObject>, recordHistory?: boolean) => void
  deleteObject: (id: string, recordHistory?: boolean) => void
  eraseAtPoint: (x: number, y: number, radius: number) => CanvasObject[] // Returns new split objects
  deleteObjectsInArea: (x: number, y: number, radius: number) => string[]
  
  // Batch operations for sync (no history recording)
  setObjects: (objects: Map<string, CanvasObject>) => void
  
  // Selection
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  addToSelection: (id: string) => void
  removeFromSelection: (id: string) => void
  toggleSelection: (id: string, shiftKey: boolean) => void
  selectAll: () => void
  
  // Clipboard
  clipboard: CanvasObject[]
  copyToClipboard: () => void
  cutToClipboard: () => void
  pasteFromClipboard: () => void
  duplicateSelected: () => void
  
  // Delete selected
  deleteSelected: () => void
  
  // Drawing state
  isDrawing: boolean
  setIsDrawing: (drawing: boolean) => void
  currentStroke: { x: number; y: number }[]
  addStrokePoint: (point: { x: number; y: number }) => void
  clearStroke: () => void
  
  // History (Undo/Redo)
  history: HistoryAction[]
  historyIndex: number
  maxHistorySize: number
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  pushHistory: (action: HistoryAction) => void
  clearHistory: () => void
  
  // Board management
  exportBoard: () => string
  importBoard: (json: string) => boolean
  clearBoard: () => void
  
  // User name mapping (userId -> displayName)
  userNames: Map<string, string>
  setUserName: (userId: string, displayName: string) => void
  
  // Current user context
  currentUserId: string
  setCurrentUserId: (userId: string) => void
  
  // Persistence
  saveToLocalStorage: () => void
  loadFromLocalStorage: () => boolean
  clearLocalStorage: () => void
  
  // Waypoints for Minimap navigation
  waypoints: Waypoint[]
  addWaypoint: (name: string) => void
  removeWaypoint: (id: string) => void
  navigateToWaypoint: (id: string) => void
  
  // Laser pointer
  laserState: LaserState
  setLaserState: (state: Partial<LaserState>) => void
  addLaserTrailPoint: (x: number, y: number) => void
  clearLaserTrail: () => void
  
  // Last used tool (for quick-access with key 0)
  lastUsedTool: Tool
  setLastUsedTool: (tool: Tool) => void
  
  // Selection box (drag to select)
  selectionBox: { startX: number; startY: number; endX: number; endY: number } | null
  setSelectionBox: (box: { startX: number; startY: number; endX: number; endY: number } | null) => void
  
  // Connector creation state
  pendingConnector: { sourceAnchor: ConnectorAnchor } | null
  setPendingConnector: (pending: { sourceAnchor: ConnectorAnchor } | null) => void
  createConnector: (sourceAnchor: ConnectorAnchor, targetAnchor: ConnectorAnchor) => void
  updateConnectorPaths: () => void  // Recalculate all connector paths when objects move
  
  // ============= Phase 4: Workspace Regions =============
  workspaceRegions: WorkspaceRegion[]
  workspaceDrawMode: boolean
  setWorkspaceDrawMode: (enabled: boolean) => void
  setWorkspaceRegions: (regions: WorkspaceRegion[]) => void
  addWorkspaceRegion: (region: Omit<WorkspaceRegion, 'id' | 'createdAt' | 'createdBy'>) => WorkspaceRegion
  updateWorkspaceRegion: (id: string, changes: Partial<WorkspaceRegion>) => void
  removeWorkspaceRegion: (id: string) => void
  getRegionAt: (x: number, y: number) => WorkspaceRegion | null
  canEditAt: (x: number, y: number) => boolean
  
  // ============= Phase 4: Presenter Mode =============
  presenterState: PresenterState
  startPresenting: () => void
  stopPresenting: () => void
  followPresenter: (follow: boolean) => void
  updatePresenterViewport: (viewport: Viewport) => void
  setPresenter: (presenter: PresenterInfo | null) => void
  addFollower: (followerId: string) => void
  removeFollower: (followerId: string) => void
  showPresenterInvite: () => void
  dismissPresenterInvite: (declined: boolean) => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Viewport - start at origin
  viewport: { x: 0, y: 0, scale: 1 },
  setViewport: (partial) => set((state) => ({
    viewport: { ...state.viewport, ...partial }
  })),
  
  // Tool
  currentTool: 'pen',
  setTool: (tool) => set({ currentTool: tool }),
  
  // Tool settings with defaults
  toolSettings: {
    strokeWidth: 3,
    eraserWidth: 20,
    fontSize: 16,
    shapeStrokeWidth: 2,
    shapeType: 'rect' as ShapeType,
    color: '#ffffff',
    fillColor: 'transparent',
    stickyColor: '#FEF08A',
    connectorLineType: 'straight' as ConnectorLineType,
    connectorStartArrow: 'none' as ConnectorArrowType,
    connectorEndArrow: 'arrow' as ConnectorArrowType,
  },
  setToolSettings: (partial) => set((state) => ({
    toolSettings: { ...state.toolSettings, ...partial }
  })),
  
  // History
  history: [],
  historyIndex: -1,
  maxHistorySize: 100,
  
  pushHistory: (action) => set((state) => {
    // Remove any redo actions when new action is pushed
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push(action)
    
    // Limit history size
    if (newHistory.length > state.maxHistorySize) {
      newHistory.shift()
      return { history: newHistory, historyIndex: newHistory.length - 1 }
    }
    
    return { history: newHistory, historyIndex: newHistory.length - 1 }
  }),
  
  clearHistory: () => set({ history: [], historyIndex: -1 }),
  
  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  
  undo: () => {
    const state = get()
    if (state.historyIndex < 0) return
    
    const action = state.history[state.historyIndex]
    const newMap = new Map(state.objects)
    
    switch (action.type) {
      case 'add':
        // Undo add = delete
        if (action.objectId) {
          newMap.delete(action.objectId)
        }
        break
        
      case 'update':
        // Undo update = restore previous state
        if (action.objectId && action.previousState) {
          newMap.set(action.objectId, action.previousState)
        }
        break
        
      case 'delete':
        // Undo delete = restore object
        if (action.objectId && action.previousState) {
          newMap.set(action.objectId, action.previousState)
        }
        break
        
      case 'multi':
        // Undo multi = delete created, restore deleted
        if (action.createdObjects) {
          action.createdObjects.forEach(obj => newMap.delete(obj.id))
        }
        if (action.deletedObjects) {
          action.deletedObjects.forEach(obj => newMap.set(obj.id, obj))
        }
        break
    }
    
    set({ objects: newMap, historyIndex: state.historyIndex - 1 })
  },
  
  redo: () => {
    const state = get()
    if (state.historyIndex >= state.history.length - 1) return
    
    const action = state.history[state.historyIndex + 1]
    const newMap = new Map(state.objects)
    
    switch (action.type) {
      case 'add':
        // Redo add = add again
        if (action.newState) {
          newMap.set(action.newState.id, action.newState)
        }
        break
        
      case 'update':
        // Redo update = apply new state
        if (action.objectId && action.newState) {
          newMap.set(action.objectId, action.newState)
        }
        break
        
      case 'delete':
        // Redo delete = delete again
        if (action.objectId) {
          newMap.delete(action.objectId)
        }
        break
        
      case 'multi':
        // Redo multi = restore created, delete restored
        if (action.deletedObjects) {
          action.deletedObjects.forEach(obj => newMap.delete(obj.id))
        }
        if (action.createdObjects) {
          action.createdObjects.forEach(obj => newMap.set(obj.id, obj))
        }
        break
    }
    
    set({ objects: newMap, historyIndex: state.historyIndex + 1 })
  },
  
  // Objects
  objects: new Map(),
  
  setObjects: (objects) => set({ objects }),
  
  addObject: (obj, recordHistory = true) => set((state) => {
    const newMap = new Map(state.objects)
    newMap.set(obj.id, obj)
    
    if (recordHistory) {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push({ 
        type: 'add', 
        objectId: obj.id, 
        newState: obj,
        timestamp: Date.now(),
        userId: state.currentUserId,
      })
      if (newHistory.length > state.maxHistorySize) newHistory.shift()
      return { objects: newMap, history: newHistory, historyIndex: newHistory.length - 1 }
    }
    
    return { objects: newMap }
  }),
  
  updateObject: (id, changes, recordHistory = true) => set((state) => {
    const obj = state.objects.get(id)
    if (!obj) return state
    
    const newObj = { ...obj, ...changes }
    const newMap = new Map(state.objects)
    newMap.set(id, newObj)
    
    if (recordHistory) {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push({ 
        type: 'update', 
        objectId: id, 
        previousState: obj, 
        newState: newObj,
        timestamp: Date.now(),
        userId: state.currentUserId,
      })
      if (newHistory.length > state.maxHistorySize) newHistory.shift()
      return { objects: newMap, history: newHistory, historyIndex: newHistory.length - 1 }
    }
    
    return { objects: newMap }
  }),
  
  deleteObject: (id, recordHistory = true) => set((state) => {
    const obj = state.objects.get(id)
    if (!obj) return state
    
    const newMap = new Map(state.objects)
    newMap.delete(id)
    
    if (recordHistory) {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push({ 
        type: 'delete', 
        objectId: id, 
        previousState: obj,
        timestamp: Date.now(),
        userId: state.currentUserId,
      })
      if (newHistory.length > state.maxHistorySize) newHistory.shift()
      return { objects: newMap, history: newHistory, historyIndex: newHistory.length - 1 }
    }
    
    return { objects: newMap }
  }),
  
  // Erase at point - splits strokes instead of deleting whole objects
  // Returns deleted and created objects for history tracking
  eraseAtPoint: (x, y, radius) => {
    const state = get()
    const newMap = new Map(state.objects)
    const newObjects: CanvasObject[] = []
    const deletedObjects: CanvasObject[] = []
    
    state.objects.forEach((obj, id) => {
      if (obj.type === 'stroke') {
        const { points, stroke, strokeWidth } = obj.data as {
          points: number[]
          stroke: string
          strokeWidth: number
        }
        
        // Check each segment of the stroke
        const segments: number[][] = []
        let currentSegment: number[] = []
        
        for (let i = 0; i < points.length; i += 2) {
          const px = points[i]
          const py = points[i + 1]
          const distance = Math.sqrt((px - x) ** 2 + (py - y) ** 2)
          
          if (distance > radius) {
            // Point is outside eraser
            currentSegment.push(px, py)
          } else {
            // Point is inside eraser - split here
            if (currentSegment.length >= 4) { // Need at least 2 points
              segments.push([...currentSegment])
            }
            currentSegment = []
          }
        }
        
        // Don't forget the last segment
        if (currentSegment.length >= 4) {
          segments.push(currentSegment)
        }
        
        // If stroke was modified (either split into multiple segments or shortened)
        const wasModified = segments.length === 0 || // Completely erased
          segments.length > 1 || // Split into multiple
          (segments.length === 1 && segments[0].length < points.length) // Shortened
        
        if (wasModified) {
          // Track deleted object
          deletedObjects.push(obj)
          
          // Original stroke was modified - delete it
          newMap.delete(id)
          
          // Create new strokes for remaining segments
          segments.forEach((segmentPoints, idx) => {
            if (segmentPoints.length >= 4) {
              const minX = Math.min(...segmentPoints.filter((_, i) => i % 2 === 0))
              const minY = Math.min(...segmentPoints.filter((_, i) => i % 2 === 1))
              const maxX = Math.max(...segmentPoints.filter((_, i) => i % 2 === 0))
              const maxY = Math.max(...segmentPoints.filter((_, i) => i % 2 === 1))
              
              const newObj: CanvasObject = {
                id: `${id}-split-${idx}-${Date.now()}`,
                type: 'stroke',
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
                data: { points: segmentPoints, stroke, strokeWidth },
                createdAt: Date.now(),
              }
              newMap.set(newObj.id, newObj)
              newObjects.push(newObj)
            }
          })
        }
      } else {
        // For non-stroke objects, check if eraser intersects
        const objCenterX = obj.x + obj.width / 2
        const objCenterY = obj.y + obj.height / 2
        const distance = Math.sqrt((objCenterX - x) ** 2 + (objCenterY - y) ** 2)
        
        if (distance <= radius + Math.max(obj.width, obj.height) / 2) {
          deletedObjects.push(obj)
          newMap.delete(id)
        }
      }
    })
    
    // Record history if anything was modified
    if (deletedObjects.length > 0 || newObjects.length > 0) {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push({
        type: 'multi',
        deletedObjects: deletedObjects,
        createdObjects: newObjects,
        timestamp: Date.now(),
        userId: state.currentUserId,
      })
      if (newHistory.length > state.maxHistorySize) newHistory.shift()
      set({ objects: newMap, history: newHistory, historyIndex: newHistory.length - 1 })
    } else {
      set({ objects: newMap })
    }
    
    return newObjects
  },
  
  deleteObjectsInArea: (x, y, radius) => {
    const state = get()
    const deletedIds: string[] = []
    const newMap = new Map(state.objects)
    
    state.objects.forEach((obj, id) => {
      // Check if object center is within radius
      const objCenterX = obj.x + obj.width / 2
      const objCenterY = obj.y + obj.height / 2
      const distance = Math.sqrt((objCenterX - x) ** 2 + (objCenterY - y) ** 2)
      
      if (distance <= radius + Math.max(obj.width, obj.height) / 2) {
        newMap.delete(id)
        deletedIds.push(id)
      }
    })
    
    set({ objects: newMap })
    return deletedIds
  },
  
  // Selection
  selectedIds: new Set(),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  
  addToSelection: (id) => set((state) => {
    const newSet = new Set(state.selectedIds)
    newSet.add(id)
    return { selectedIds: newSet }
  }),
  
  removeFromSelection: (id) => set((state) => {
    const newSet = new Set(state.selectedIds)
    newSet.delete(id)
    return { selectedIds: newSet }
  }),
  
  toggleSelection: (id, shiftKey) => set((state) => {
    if (shiftKey) {
      // Mit Shift: zur Auswahl hinzufügen/entfernen
      const newSet = new Set(state.selectedIds)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return { selectedIds: newSet }
    } else {
      // Ohne Shift: nur dieses Objekt auswählen
      return { selectedIds: new Set([id]) }
    }
  }),
  
  selectAll: () => set((state) => ({
    selectedIds: new Set(state.objects.keys())
  })),
  
  // Clipboard
  clipboard: [],
  
  copyToClipboard: () => set((state) => {
    const objectsToCopy = Array.from(state.selectedIds)
      .map(id => state.objects.get(id))
      .filter((obj): obj is CanvasObject => obj !== undefined)
    return { clipboard: objectsToCopy }
  }),
  
  cutToClipboard: () => {
    const state = get()
    // Erst kopieren
    const objectsToCut = Array.from(state.selectedIds)
      .map(id => state.objects.get(id))
      .filter((obj): obj is CanvasObject => obj !== undefined)
    
    if (objectsToCut.length === 0) return
    
    // Dann löschen mit History
    const newMap = new Map(state.objects)
    objectsToCut.forEach(obj => newMap.delete(obj.id))
    
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push({
      type: 'multi',
      deletedObjects: objectsToCut,
      createdObjects: [],
      timestamp: Date.now(),
      userId: state.currentUserId,
    })
    if (newHistory.length > state.maxHistorySize) newHistory.shift()
    
    set({
      clipboard: objectsToCut,
      objects: newMap,
      selectedIds: new Set(),
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },
  
  pasteFromClipboard: () => {
    const state = get()
    if (state.clipboard.length === 0) return
    
    // Offset für eingefügte Objekte
    const offset = 20
    
    const newObjects: CanvasObject[] = state.clipboard.map(obj => ({
      ...obj,
      id: `${obj.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: obj.x + offset,
      y: obj.y + offset,
      createdAt: Date.now(),
    }))
    
    const newMap = new Map(state.objects)
    newObjects.forEach(obj => newMap.set(obj.id, obj))
    
    // History
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push({
      type: 'multi',
      deletedObjects: [],
      createdObjects: newObjects,
      timestamp: Date.now(),
      userId: state.currentUserId,
    })
    if (newHistory.length > state.maxHistorySize) newHistory.shift()
    
    set({
      objects: newMap,
      selectedIds: new Set(newObjects.map(o => o.id)),
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },
  
  duplicateSelected: () => {
    const state = get()
    if (state.selectedIds.size === 0) return
    
    const offset = 20
    const objectsToDuplicate = Array.from(state.selectedIds)
      .map(id => state.objects.get(id))
      .filter((obj): obj is CanvasObject => obj !== undefined)
    
    const newObjects: CanvasObject[] = objectsToDuplicate.map(obj => ({
      ...obj,
      id: `${obj.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: obj.x + offset,
      y: obj.y + offset,
      createdAt: Date.now(),
    }))
    
    const newMap = new Map(state.objects)
    newObjects.forEach(obj => newMap.set(obj.id, obj))
    
    // History
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push({
      type: 'multi',
      deletedObjects: [],
      createdObjects: newObjects,
      timestamp: Date.now(),
      userId: state.currentUserId,
    })
    if (newHistory.length > state.maxHistorySize) newHistory.shift()
    
    set({
      objects: newMap,
      selectedIds: new Set(newObjects.map(o => o.id)),
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },
  
  // Delete selected objects
  deleteSelected: () => {
    const state = get()
    if (state.selectedIds.size === 0) return
    
    const objectsToDelete = Array.from(state.selectedIds)
      .map(id => state.objects.get(id))
      .filter((obj): obj is CanvasObject => obj !== undefined)
    
    if (objectsToDelete.length === 0) return
    
    const newMap = new Map(state.objects)
    objectsToDelete.forEach(obj => newMap.delete(obj.id))
    
    // History
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push({
      type: 'multi',
      deletedObjects: objectsToDelete,
      createdObjects: [],
      timestamp: Date.now(),
      userId: state.currentUserId,
    })
    if (newHistory.length > state.maxHistorySize) newHistory.shift()
    
    set({
      objects: newMap,
      selectedIds: new Set(),
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },
  
  // Drawing
  isDrawing: false,
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  currentStroke: [],
  addStrokePoint: (point) => set((state) => ({
    currentStroke: [...state.currentStroke, point]
  })),
  clearStroke: () => set({ currentStroke: [] }),
  
  // Board management - Export/Import/Clear
  exportBoard: () => {
    const state = get()
    const boardData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      viewport: state.viewport,
      objects: Array.from(state.objects.values()),
    }
    return JSON.stringify(boardData, null, 2)
  },
  
  importBoard: (json: string) => {
    try {
      const data = JSON.parse(json)
      if (!data.objects || !Array.isArray(data.objects)) {
        console.error('Ungültiges Board-Format')
        return false
      }
      
      const newObjects = new Map<string, CanvasObject>()
      data.objects.forEach((obj: CanvasObject) => {
        newObjects.set(obj.id, obj)
      })
      
      set({ 
        objects: newObjects,
        viewport: data.viewport || { x: 0, y: 0, scale: 1 },
        selectedIds: new Set(),
      })
      return true
    } catch (e) {
      console.error('Fehler beim Importieren:', e)
      return false
    }
  },
  
  clearBoard: () => set({ 
    objects: new Map(),
    selectedIds: new Set(),
    currentStroke: [],
  }),
  
  // User name mapping
  userNames: new Map(),
  setUserName: (userId, displayName) => set((state) => {
    const newMap = new Map(state.userNames)
    newMap.set(userId, displayName)
    return { userNames: newMap }
  }),
  
  // Current user context
  currentUserId: '',
  setCurrentUserId: (userId) => set({ currentUserId: userId }),
  
  // Persistence
  saveToLocalStorage: () => {
    const state = get()
    const boardData = {
      version: 2,
      savedAt: Date.now(),
      viewport: state.viewport,
      objects: Array.from(state.objects.values()),
      history: state.history,
      historyIndex: state.historyIndex,
      userNames: Array.from(state.userNames.entries()),
    }
    try {
      localStorage.setItem('canvas_board_data', JSON.stringify(boardData))
    } catch (e) {
      console.error('Fehler beim Speichern:', e)
    }
  },
  
  loadFromLocalStorage: () => {
    try {
      const json = localStorage.getItem('canvas_board_data')
      if (!json) return false
      
      const data = JSON.parse(json)
      if (!data.objects || !Array.isArray(data.objects)) return false
      
      const newObjects = new Map<string, CanvasObject>()
      data.objects.forEach((obj: CanvasObject) => {
        newObjects.set(obj.id, obj)
      })
      
      const newUserNames = new Map<string, string>()
      if (data.userNames && Array.isArray(data.userNames)) {
        data.userNames.forEach(([id, name]: [string, string]) => {
          newUserNames.set(id, name)
        })
      }
      
      set({ 
        objects: newObjects,
        viewport: data.viewport || { x: 0, y: 0, scale: 1 },
        history: data.history || [],
        historyIndex: data.historyIndex ?? -1,
        userNames: newUserNames,
        selectedIds: new Set(),
      })
      return true
    } catch (e) {
      console.error('Fehler beim Laden aus localStorage:', e)
      return false
    }
  },
  
  clearLocalStorage: () => {
    localStorage.removeItem('canvas_board_data')
  },
  
  // Waypoints for Minimap navigation
  waypoints: [],
  
  addWaypoint: (name) => set((state) => {
    const waypoint: Waypoint = {
      id: `waypoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      x: state.viewport.x,
      y: state.viewport.y,
      scale: state.viewport.scale,
      createdAt: Date.now(),
    }
    return { waypoints: [...state.waypoints, waypoint] }
  }),
  
  removeWaypoint: (id) => set((state) => ({
    waypoints: state.waypoints.filter(w => w.id !== id)
  })),
  
  navigateToWaypoint: (id) => {
    const state = get()
    const waypoint = state.waypoints.find(w => w.id === id)
    if (waypoint) {
      set({
        viewport: {
          x: waypoint.x,
          y: waypoint.y,
          scale: waypoint.scale,
        }
      })
    }
  },
  
  // Laser pointer
  laserState: {
    isActive: false,
    isPressed: false,
    x: 0,
    y: 0,
    trail: [],
    color: '#EF4444',  // Rot als Default
    size: 3,           // Mittel als Default
  },
  
  setLaserState: (partial) => set((state) => ({
    laserState: { ...state.laserState, ...partial }
  })),
  
  addLaserTrailPoint: (x, y) => set((state) => {
    // Nur Trail hinzufügen wenn Maus gedrückt ist
    if (!state.laserState.isPressed) return state
    
    const now = Date.now()
    // Keep only trail points from last 500ms
    const recentTrail = state.laserState.trail.filter(p => now - p.timestamp < 500)
    return {
      laserState: {
        ...state.laserState,
        x,
        y,
        trail: [...recentTrail, { x, y, timestamp: now }],
      }
    }
  }),
  
  clearLaserTrail: () => set((state) => ({
    laserState: { ...state.laserState, isActive: false, isPressed: false, trail: [] }
  })),
  
  // Last used tool (for quick-access with key 0)
  lastUsedTool: 'pen',
  setLastUsedTool: (tool) => set({ lastUsedTool: tool }),
  
  // Selection box (drag to select)
  selectionBox: null,
  setSelectionBox: (box) => set({ selectionBox: box }),
  
  // Connector creation state
  pendingConnector: null,
  setPendingConnector: (pending) => set({ pendingConnector: pending }),
  
  createConnector: (sourceAnchor, targetAnchor) => {
    const state = get()
    const { toolSettings } = state
    
    // Calculate initial path
    const sourceObj = state.objects.get(sourceAnchor.objectId)
    const targetObj = state.objects.get(targetAnchor.objectId)
    
    if (!sourceObj || !targetObj) return
    
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
    
    const sourcePoint = getAnchorPoint(sourceObj, sourceAnchor.position)
    const targetPoint = getAnchorPoint(targetObj, targetAnchor.position)
    
    const connectorData: ConnectorData = {
      sourceAnchor,
      targetAnchor,
      lineType: toolSettings.connectorLineType,
      startArrow: toolSettings.connectorStartArrow,
      endArrow: toolSettings.connectorEndArrow,
      stroke: toolSettings.color,
      strokeWidth: toolSettings.shapeStrokeWidth,
      points: [sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y],
    }
    
    const connector: CanvasObject = {
      id: `connector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'connector',
      x: Math.min(sourcePoint.x, targetPoint.x),
      y: Math.min(sourcePoint.y, targetPoint.y),
      width: Math.abs(targetPoint.x - sourcePoint.x),
      height: Math.abs(targetPoint.y - sourcePoint.y),
      data: connectorData as unknown as Record<string, unknown>,
      createdAt: Date.now(),
    }
    
    // Use addObject to handle history
    get().addObject(connector, true)
    set({ pendingConnector: null })
  },
  
  updateConnectorPaths: () => {
    const state = get()
    const newMap = new Map(state.objects)
    let hasChanges = false
    
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
    
    state.objects.forEach((obj, id) => {
      if (obj.type === 'connector') {
        const data = obj.data as unknown as ConnectorData
        const sourceObj = state.objects.get(data.sourceAnchor.objectId)
        const targetObj = state.objects.get(data.targetAnchor.objectId)
        
        if (sourceObj && targetObj) {
          const sourcePoint = getAnchorPoint(sourceObj, data.sourceAnchor.position)
          const targetPoint = getAnchorPoint(targetObj, data.targetAnchor.position)
          
          const newPoints = [sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y]
          
          // Check if points changed
          if (JSON.stringify(data.points) !== JSON.stringify(newPoints)) {
            const updatedConnector: CanvasObject = {
              ...obj,
              x: Math.min(sourcePoint.x, targetPoint.x),
              y: Math.min(sourcePoint.y, targetPoint.y),
              width: Math.abs(targetPoint.x - sourcePoint.x),
              height: Math.abs(targetPoint.y - sourcePoint.y),
              data: { ...data, points: newPoints },
            }
            newMap.set(id, updatedConnector)
            hasChanges = true
          }
        }
      }
    })
    
    if (hasChanges) {
      set({ objects: newMap })
    }
  },
  
  // ============= Phase 4: Workspace Regions =============
  workspaceRegions: [],
  workspaceDrawMode: false,
  setWorkspaceDrawMode: (enabled) => set({ workspaceDrawMode: enabled }),
  
  setWorkspaceRegions: (regions) => set({ workspaceRegions: regions }),
  
  addWorkspaceRegion: (region) => {
    const newRegion: WorkspaceRegion = {
      ...region,
      id: `region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdBy: get().currentUserId,
      createdAt: Date.now(),
    }
    set((state) => ({
      workspaceRegions: [...state.workspaceRegions, newRegion],
    }))
    return newRegion
  },
  
  updateWorkspaceRegion: (id, changes) => set((state) => ({
    workspaceRegions: state.workspaceRegions.map((region) =>
      region.id === id ? { ...region, ...changes } : region
    ),
  })),
  
  removeWorkspaceRegion: (id) => set((state) => ({
    workspaceRegions: state.workspaceRegions.filter((region) => region.id !== id),
  })),
  
  getRegionAt: (x, y) => {
    const state = get()
    return state.workspaceRegions.find((region) =>
      x >= region.bounds.x1 && x <= region.bounds.x2 &&
      y >= region.bounds.y1 && y <= region.bounds.y2
    ) || null
  },
  
  canEditAt: (x, y) => {
    const state = get()
    const { workspaceRegions, currentUserId } = state
    
    // Find all regions that contain this point
    const containingRegions = workspaceRegions.filter((region) =>
      x >= region.bounds.x1 && x <= region.bounds.x2 &&
      y >= region.bounds.y1 && y <= region.bounds.y2
    )
    
    // If no region defined, can edit everywhere
    if (containingRegions.length === 0) return true
    
    // Check permissions in containing regions
    for (const region of containingRegions) {
      const userPerm = region.permissions.find((p) =>
        p.userId === currentUserId || p.userId === '*'
      )
      if (userPerm?.role === 'editor') return true
    }
    
    return false
  },
  
  // ============= Phase 4: Presenter Mode =============
  presenterState: {
    isPresenting: false,
    isFollowing: false,
    presenter: null,
    followerIds: new Set(),
    presenterViewport: null,
    invitePending: false,
    inviteDeclined: false,
  },
  
  startPresenting: () => set((state) => ({
    presenterState: {
      ...state.presenterState,
      isPresenting: true,
      isFollowing: false,
      presenter: null,
      followerIds: new Set(),
    },
  })),
  
  stopPresenting: () => set((state) => ({
    presenterState: {
      ...state.presenterState,
      isPresenting: false,
      followerIds: new Set(),
    },
  })),
  
  followPresenter: (follow) => set((state) => ({
    presenterState: {
      ...state.presenterState,
      isFollowing: follow,
    },
  })),
  
  updatePresenterViewport: (viewport) => set((state) => ({
    presenterState: {
      ...state.presenterState,
      // Neues Objekt mit spread um React-Updates zu triggern
      presenterViewport: { ...viewport },
    },
  })),
  
  setPresenter: (presenter) => set((state) => ({
    presenterState: {
      ...state.presenterState,
      presenter,
      isPresenting: false,
      isFollowing: presenter !== null ? state.presenterState.isFollowing : false,
      // Einladungsstatus zurücksetzen wenn Presenter endet
      invitePending: presenter !== null ? state.presenterState.invitePending : false,
      inviteDeclined: presenter !== null ? state.presenterState.inviteDeclined : false,
    },
  })),
  
  addFollower: (followerId) => set((state) => {
    const newFollowerIds = new Set(state.presenterState.followerIds)
    newFollowerIds.add(followerId)
    return {
      presenterState: {
        ...state.presenterState,
        followerIds: newFollowerIds,
      },
    }
  }),
  
  removeFollower: (followerId) => set((state) => {
    const newFollowerIds = new Set(state.presenterState.followerIds)
    newFollowerIds.delete(followerId)
    return {
      presenterState: {
        ...state.presenterState,
        followerIds: newFollowerIds,
      },
    }
  }),
  
  showPresenterInvite: () => set((state) => ({
    presenterState: {
      ...state.presenterState,
      invitePending: true,
    },
  })),
  
  dismissPresenterInvite: (declined) => set((state) => ({
    presenterState: {
      ...state.presenterState,
      invitePending: false,
      inviteDeclined: declined,
    },
  })),
}))
