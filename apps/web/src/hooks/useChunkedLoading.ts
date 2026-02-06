import { useState, useCallback, useRef } from 'react'

interface Viewport {
  x: number
  y: number
  width: number
  height: number
  scale: number
}

interface ChunkStats {
  totalObjects: number
  totalChunks: number
  nonEmptyChunks: number
  chunkSize: number
}

interface UseChunkedLoadingOptions {
  boardId: string
  enabled?: boolean
  preloadRadius?: number  // How many chunks to preload around viewport
  debounceMs?: number     // Debounce viewport changes
}

interface UseChunkedLoadingReturn {
  loadedObjects: Map<string, any>
  loadedChunks: Set<string>
  stats: ChunkStats | null
  isLoading: boolean
  loadViewport: (viewport: Viewport) => Promise<void>
  preloadAround: (x: number, y: number) => Promise<void>
}

export function useChunkedLoading({
  boardId,
  enabled = true,
  preloadRadius = 1,
  // debounceMs not used currently - can be enabled for scroll optimization
}: UseChunkedLoadingOptions): UseChunkedLoadingReturn {
  const [loadedObjects, setLoadedObjects] = useState<Map<string, any>>(new Map())
  const [loadedChunks, setLoadedChunks] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<ChunkStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const lastViewportRef = useRef<string | null>(null)
  
  // Load objects in viewport
  const loadViewport = useCallback(async (viewport: Viewport) => {
    if (!enabled) return
    
    // Calculate world coordinates from screen viewport
    const worldMinX = -viewport.x / viewport.scale
    const worldMinY = -viewport.y / viewport.scale
    const worldMaxX = worldMinX + viewport.width / viewport.scale
    const worldMaxY = worldMinY + viewport.height / viewport.scale
    
    // Create viewport key to deduplicate requests
    const viewportKey = `${Math.floor(worldMinX / 100)},${Math.floor(worldMinY / 100)},${Math.floor(worldMaxX / 100)},${Math.floor(worldMaxY / 100)}`
    
    // Skip if same viewport area
    if (viewportKey === lastViewportRef.current) return
    lastViewportRef.current = viewportKey
    
    setIsLoading(true)
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/boards/${boardId}/chunks/viewport`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            min_x: worldMinX - 500,  // Add margin
            min_y: worldMinY - 500,
            max_x: worldMaxX + 500,
            max_y: worldMaxY + 500,
          }),
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        
        // Update loaded objects
        setLoadedObjects(prev => {
          const next = new Map(prev)
          for (const obj of data.objects) {
            next.set(obj.id, obj)
          }
          return next
        })
        
        // Update loaded chunks
        setLoadedChunks(prev => {
          const next = new Set(prev)
          for (const chunkId of data.loaded_chunks) {
            next.add(chunkId)
          }
          return next
        })
        
        // Update stats
        setStats({
          totalObjects: data.stats.total_objects,
          totalChunks: data.stats.total_chunks,
          nonEmptyChunks: data.stats.non_empty_chunks,
          chunkSize: data.stats.chunk_size,
        })
      }
    } catch (error) {
      console.error('Failed to load viewport:', error)
    } finally {
      setIsLoading(false)
    }
  }, [boardId, enabled])
  
  // Note: debounced loading removed for simplicity - can be added back if needed
  // Debouncing would wrap loadViewport in a setTimeout for scroll optimization
  
  // Preload chunks around a position
  const preloadAround = useCallback(async (x: number, y: number) => {
    if (!enabled) return
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/boards/${boardId}/chunks/around?x=${x}&y=${y}&radius=${preloadRadius}`
      )
      
      if (response.ok) {
        const data = await response.json()
        
        // Update loaded objects
        setLoadedObjects(prev => {
          const next = new Map(prev)
          for (const chunk of data.chunks) {
            for (const obj of chunk.objects) {
              next.set(obj.id, obj)
            }
          }
          return next
        })
        
        // Update loaded chunks
        setLoadedChunks(prev => {
          const next = new Set(prev)
          for (const chunk of data.chunks) {
            next.add(chunk.id)
          }
          return next
        })
      }
    } catch (error) {
      console.error('Failed to preload chunks:', error)
    }
  }, [boardId, enabled, preloadRadius])
  
  return {
    loadedObjects,
    loadedChunks,
    stats,
    isLoading,
    loadViewport,
    preloadAround,
  }
}
