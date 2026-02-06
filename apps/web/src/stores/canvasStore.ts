import { create } from 'zustand'

export type Tool = 'select' | 'pen' | 'eraser' | 'shape' | 'text' | 'sticky' | 'pan'
export type ShapeType = 'rect' | 'circle' | 'triangle' | 'line' | 'arrow' | 'diamond'

export interface CanvasObject {
  id: string
  type: 'stroke' | 'shape' | 'text' | 'sticky' | 'image'
  x: number
  y: number
  width: number
  height: number
  data: Record<string, unknown>
  createdAt: number
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
}))
