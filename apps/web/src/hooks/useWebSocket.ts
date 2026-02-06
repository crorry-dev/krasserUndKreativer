import { useEffect, useRef, useCallback, useState } from 'react'
import { useCanvasStore, CanvasObject, Viewport, PresenterInfo, WorkspaceRegion } from '@/stores/canvasStore'
import { useChatStore, ChatMessage } from '@/stores/chatStore'
import { useUserSettingsStore } from '@/stores/userSettingsStore'

interface RemoteUser {
  userId: string
  displayName: string
  color: string
  cursorX: number
  cursorY: number
  avatarUrl?: string | null
  channelId?: string | null
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
  const avatarUrl = useUserSettingsStore((s) => s.profile.avatarDataUrl)
  
  const { 
    addObject, 
    updateObject, 
    deleteObject,
    setPresenter,
    updatePresenterViewport,
    showPresenterInvite,
    followPresenter,
    setWorkspaceRegions,
  } = useCanvasStore()
  
  // Chat Store
  const { 
    addMessage: addChatMessage,
    setTyping,
    setParticipant,
    removeParticipant,
  } = useChatStore()
  
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
    
    // WebSocket-URL: bevorzugt VITE_WS_URL, sonst aus VITE_API_URL/Location ableiten
    const envWsUrl = import.meta.env.VITE_WS_URL as string | undefined
    const envApiUrl = import.meta.env.VITE_API_URL as string | undefined

    let wsBase: string
    if (envWsUrl) {
      wsBase = envWsUrl
    } else if (envApiUrl) {
      wsBase = envApiUrl.replace(/^http/, 'ws')
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const wsHost = window.location.hostname === 'localhost'
        ? 'localhost:8000'
        : `${window.location.hostname}:8000`
      wsBase = `${protocol}://${wsHost}`
    }

    const wsUrl = new URL(`/ws/${boardId}`, wsBase)
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

      // Publish user profile (avatar/display name)
      ws.send(JSON.stringify({
        type: 'user_profile',
        displayName,
        avatarUrl: avatarUrl ?? null,
      }))
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
  }, [boardId, userId, displayName, avatarUrl])
  
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

        // Sync chat participants with full list
        const incomingIds = new Set(users.map(u => u.userId))
        users.forEach((u) => {
          setParticipant({
            id: u.userId,
            name: u.displayName,
            color: u.color,
            isOnline: true,
          })
        })
        // Remove participants not in list (except self)
        const chatState = useChatStore.getState()
        chatState.participants.forEach((p) => {
          if (p.id !== chatState.currentUserId && !incomingIds.has(p.id)) {
            removeParticipant(p.id)
          }
        })
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
            avatarUrl: data.avatarUrl as string | null | undefined,
            channelId: data.channelId as string | null | undefined,
          })
          return next
        })

        setParticipant({
          id: data.userId as string,
          name: data.displayName as string,
          color: data.color as string,
          isOnline: true,
        })
        break
      
      case 'user_left':
        setRemoteUsers(prev => {
          const next = new Map(prev)
          next.delete(data.userId as string)
          return next
        })

        removeParticipant(data.userId as string)
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

      case 'voice_channel_join':
      case 'voice_channel_move':
        setRemoteUsers(prev => {
          const user = prev.get(data.userId as string)
          if (!user) return prev
          const next = new Map(prev)
          next.set(data.userId as string, {
            ...user,
            channelId: data.channelId as string,
          })
          return next
        })
        break

      case 'user_profile_update':
        setRemoteUsers(prev => {
          const user = prev.get(data.userId as string)
          if (!user) return prev

          const next = new Map(prev)
          next.set(data.userId as string, {
            ...user,
            displayName: (data.displayName as string) ?? user.displayName,
            avatarUrl: (data.avatarUrl as string | null | undefined) ?? user.avatarUrl,
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
      
      // ============= Presenter Mode Events =============
      case 'presenter_start': {
        const presenterInfo: PresenterInfo = {
          id: data.userId as string,
          name: data.displayName as string,
        }
        setPresenter(presenterInfo)
        // Zeige Einladungs-Modal für alle außer dem Presenter selbst
        if (data.userId !== userId) {
          showPresenterInvite()
        }
        break
      }
      
      case 'presenter_viewport': {
        const viewport = data.viewport as Viewport
        if (viewport) {
          updatePresenterViewport(viewport)
        }
        break
      }
      
      case 'presenter_end':
        setPresenter(null)
        followPresenter(false)
        break
      
      // ============= Chat Events =============
      case 'chat_message': {
        const msg = data.message as ChatMessage
        const groupId = data.groupId as string || 'board-chat'
        if (msg && msg.senderId !== userId) {
          addChatMessage(groupId, {
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderColor: msg.senderColor,
            content: msg.content,
            type: msg.type,
            replyTo: msg.replyTo,
            location: msg.location,
          })
        }
        break
      }
      
      case 'chat_typing': {
        const typingUserId = data.userId as string
        const groupId = data.groupId as string || 'board-chat'
        const isTyping = data.isTyping as boolean
        if (typingUserId !== userId) {
          setTyping(groupId, typingUserId, isTyping)
        }
        break
      }

      // ============= Workspace Regions =============
      case 'workspace_regions_sync': {
        const regions = (data.regions as WorkspaceRegion[]) || []
        setWorkspaceRegions(regions)
        break
      }

      case 'workspace_region_create': {
        const region = data.region as WorkspaceRegion
        if (!region) break
        const state = useCanvasStore.getState()
        const exists = state.workspaceRegions.some((r) => r.id === region.id)
        if (!exists) {
          setWorkspaceRegions([...state.workspaceRegions, region])
        }
        break
      }

      case 'workspace_region_update': {
        const region = data.region as WorkspaceRegion
        if (!region) break
        const state = useCanvasStore.getState()
        const next = state.workspaceRegions.map((r) => (r.id === region.id ? region : r))
        const exists = state.workspaceRegions.some((r) => r.id === region.id)
        setWorkspaceRegions(exists ? next : [...state.workspaceRegions, region])
        break
      }

      case 'workspace_region_delete': {
        const regionId = data.regionId as string
        if (!regionId) break
        const state = useCanvasStore.getState()
        setWorkspaceRegions(state.workspaceRegions.filter((r) => r.id !== regionId))
        break
      }
    }
  }, [addObject, updateObject, deleteObject, syncBoard, setPresenter, updatePresenterViewport, showPresenterInvite, followPresenter, userId, addChatMessage, setTyping, setParticipant, removeParticipant, setWorkspaceRegions])
  
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
  
  // ============= Presenter Mode =============
  
  // Start presenting - notify all users
  const sendPresenterStart = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'presenter_start',
        userId,
        displayName,
      }))
    }
  }, [userId, displayName])
  
  // Broadcast viewport while presenting
  const sendPresenterViewport = useCallback((viewport: Viewport) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'presenter_viewport',
        viewport,
      }))
    }
  }, [])
  
  // Stop presenting
  const sendPresenterEnd = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'presenter_end',
      }))
    }
  }, [])
  
  // ============= Chat =============
  
  // Send chat message
  const sendChatMessage = useCallback((groupId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        groupId,
        message,
      }))
    }
  }, [])
  
  // Send typing indicator
  const sendChatTyping = useCallback((groupId: string, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_typing',
        groupId,
        userId,
        isTyping,
      }))
    }
  }, [userId])

  // ============= Workspace Regions =============

  const sendWorkspaceRegionCreate = useCallback((region: WorkspaceRegion) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'workspace_region_create',
        region,
      }))
    }
  }, [])

  const sendWorkspaceRegionUpdate = useCallback((region: WorkspaceRegion) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'workspace_region_update',
        region,
      }))
    }
  }, [])

  const sendWorkspaceRegionDelete = useCallback((regionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'workspace_region_delete',
        regionId,
      }))
    }
  }, [])
  
  // Event-Listener für Presenter-Aktionen von anderen Komponenten
  useEffect(() => {
    const handlePresenterStart = () => {
      sendPresenterStart()
      // Auch lokal als Presenter setzen für sofortiges Feedback
      const store = useCanvasStore.getState()
      store.startPresenting()
    }
    
    const handlePresenterEnd = () => {
      sendPresenterEnd()
      const store = useCanvasStore.getState()
      store.stopPresenting()
      store.setPresenter(null)
    }
    
    const handlePresenterViewport = (e: CustomEvent<Viewport>) => {
      sendPresenterViewport(e.detail)
    }

    const handleWorkspaceRegionCreate = (e: CustomEvent<WorkspaceRegion>) => {
      sendWorkspaceRegionCreate(e.detail)
    }

    const handleWorkspaceRegionUpdate = (e: CustomEvent<WorkspaceRegion>) => {
      sendWorkspaceRegionUpdate(e.detail)
    }

    const handleWorkspaceRegionDelete = (e: CustomEvent<{ id: string }>) => {
      sendWorkspaceRegionDelete(e.detail.id)
    }
    
    window.addEventListener('presenter:start', handlePresenterStart)
    window.addEventListener('presenter:end', handlePresenterEnd)
    window.addEventListener('presenter:viewport', handlePresenterViewport as EventListener)
    window.addEventListener('workspace_region:create', handleWorkspaceRegionCreate as EventListener)
    window.addEventListener('workspace_region:update', handleWorkspaceRegionUpdate as EventListener)
    window.addEventListener('workspace_region:delete', handleWorkspaceRegionDelete as EventListener)
    
    return () => {
      window.removeEventListener('presenter:start', handlePresenterStart)
      window.removeEventListener('presenter:end', handlePresenterEnd)
      window.removeEventListener('presenter:viewport', handlePresenterViewport as EventListener)
      window.removeEventListener('workspace_region:create', handleWorkspaceRegionCreate as EventListener)
      window.removeEventListener('workspace_region:update', handleWorkspaceRegionUpdate as EventListener)
      window.removeEventListener('workspace_region:delete', handleWorkspaceRegionDelete as EventListener)
    }
  }, [sendPresenterStart, sendPresenterEnd, sendPresenterViewport, sendWorkspaceRegionCreate, sendWorkspaceRegionUpdate, sendWorkspaceRegionDelete])
  
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

  // Push profile updates when avatar/display name changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'user_profile',
        displayName,
        avatarUrl: avatarUrl ?? null,
      }))
    }
  }, [displayName, avatarUrl])
  
  return {
    isConnected,
    remoteUsers,
    wsRef,
    sendCursorMove,
    sendObjectCreate,
    sendObjectUpdate,
    sendObjectDelete,
    // Presenter Mode
    sendPresenterStart,
    sendPresenterViewport,
    sendPresenterEnd,
    // Chat
    sendChatMessage,
    sendChatTyping,
    // Workspace Regions
    sendWorkspaceRegionCreate,
    sendWorkspaceRegionUpdate,
    sendWorkspaceRegionDelete,
  }
}
