import { useEffect, useRef, useCallback, useState } from 'react'
import { useCanvasStore, CanvasObject } from '@/stores/canvasStore'

interface RemoteUser {
  userId: string
  displayName: string
  color: string
  cursorX: number
  cursorY: number
}

interface UseWebSocketOptions {
  boardId: string
  userId?: string
  displayName?: string
}

export function useWebSocket({ boardId, userId, displayName = 'Anonymous' }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState<Map<string, RemoteUser>>(new Map())
  const reconnectTimeoutRef = useRef<number | null>(null)
  
  const { addObject, updateObject, deleteObject } = useCanvasStore()
  
  // Sync board state (merge remote objects with local)
  const syncBoard = useCallback((remoteObjects: CanvasObject[]) => {
    const store = useCanvasStore.getState()
    remoteObjects.forEach(obj => {
      // Only add if not already present locally
      if (!store.objects.has(obj.id)) {
        store.addObject(obj)
      }
    })
  }, [])
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    const wsUrl = new URL(`ws://localhost:8000/ws/${boardId}`)
    if (userId) wsUrl.searchParams.set('user_id', userId)
    wsUrl.searchParams.set('display_name', displayName)
    
    const ws = new WebSocket(wsUrl.toString())
    wsRef.current = ws
    
    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      
      // Publish local objects to server so other users can see them
      const store = useCanvasStore.getState()
      if (store.objects.size > 0) {
        const localObjects = Array.from(store.objects.values())
        console.log(`Publishing ${localObjects.length} local objects to server`)
        ws.send(JSON.stringify({
          type: 'board_publish',
          objects: localObjects,
        }))
      }
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
      
      // Reconnect after 2 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect()
      }, 2000)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleMessage(data)
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
  }, [boardId, userId, displayName])
  
  // Handle incoming messages
  const handleMessage = useCallback((data: Record<string, unknown>) => {
    switch (data.type) {
      case 'board_sync':
        // Sync all objects from server when joining
        const objects = data.objects as CanvasObject[]
        if (objects && objects.length > 0) {
          console.log(`Syncing ${objects.length} objects from server`)
          syncBoard(objects)
        }
        break
      
      case 'users_list':
        // Initial list of users already in the room
        const users = data.users as RemoteUser[]
        setRemoteUsers(new Map(users.map(u => [u.userId, u])))
        break
      
      case 'user_joined':
        setRemoteUsers(prev => {
          const next = new Map(prev)
          next.set(data.userId as string, {
            userId: data.userId as string,
            displayName: data.displayName as string,
            color: data.color as string,
            cursorX: 0,
            cursorY: 0,
          })
          return next
        })
        break
      
      case 'user_left':
        setRemoteUsers(prev => {
          const next = new Map(prev)
          next.delete(data.userId as string)
          return next
        })
        break
      
      case 'cursor_update':
        setRemoteUsers(prev => {
          const user = prev.get(data.userId as string)
          if (!user) return prev
          
          const next = new Map(prev)
          next.set(data.userId as string, {
            ...user,
            cursorX: data.x as number,
            cursorY: data.y as number,
          })
          return next
        })
        break
      
      case 'object_created':
        addObject(data.object as Parameters<typeof addObject>[0])
        break
      
      case 'object_updated':
        updateObject(
          data.objectId as string,
          data.changes as Parameters<typeof updateObject>[1]
        )
        break
      
      case 'object_deleted':
        deleteObject(data.objectId as string)
        break
    }
  }, [addObject, updateObject, deleteObject, syncBoard])
  
  // Send cursor position (throttled on caller side)
  const sendCursorMove = useCallback((x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor_move',
        x,
        y,
      }))
    }
  }, [])
  
  // Send object creation
  const sendObjectCreate = useCallback((object: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'object_create',
        object,
      }))
    }
  }, [])
  
  // Send object update
  const sendObjectUpdate = useCallback((objectId: string, changes: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'object_update',
        objectId,
        changes,
      }))
    }
  }, [])
  
  // Send object deletion
  const sendObjectDelete = useCallback((objectId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'object_delete',
        objectId,
      }))
    }
  }, [])
  
  // Connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])
  
  return {
    isConnected,
    remoteUsers,
    sendCursorMove,
    sendObjectCreate,
    sendObjectUpdate,
    sendObjectDelete,
  }
}
