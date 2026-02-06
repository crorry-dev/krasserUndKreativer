import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============= Types =============

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderColor: string
  content: string
  timestamp: number
  type: 'text' | 'system' | 'reaction' | 'location'
  replyTo?: string  // ID der Nachricht auf die geantwortet wird
  reactions?: Record<string, string[]>  // emoji -> [userIds]
  isEdited?: boolean
  location?: {
    x: number
    y: number
    scale: number
  }
}

export interface ChatGroup {
  id: string
  name: string
  type: 'board' | 'private' | 'direct'  // board = alle, private = eingeladene, direct = 1:1
  memberIds: string[]
  createdAt: number
  createdBy: string
  lastMessage?: ChatMessage
  unreadCount: number
}

export interface ChatParticipant {
  id: string
  name: string
  color: string
  isOnline: boolean
  lastSeen?: number
}

interface ChatState {
  // UI State
  isOpen: boolean
  activeGroupId: string | null
  isTyping: Map<string, string[]>  // groupId -> [userIds die tippen]
  
  // Data
  groups: Map<string, ChatGroup>
  messages: Map<string, ChatMessage[]>  // groupId -> messages
  participants: Map<string, ChatParticipant>
  
  // Current User
  currentUserId: string
  currentUserName: string
  currentUserColor: string
  
  // Actions
  setOpen: (open: boolean) => void
  setActiveGroup: (groupId: string | null) => void
  
  // Group Management
  createGroup: (group: Omit<ChatGroup, 'id' | 'createdAt' | 'unreadCount'>) => ChatGroup
  updateGroup: (groupId: string, changes: Partial<ChatGroup>) => void
  deleteGroup: (groupId: string) => void
  joinGroup: (groupId: string) => void
  leaveGroup: (groupId: string) => void
  
  // Messages
  addMessage: (groupId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => ChatMessage
  editMessage: (groupId: string, messageId: string, content: string) => void
  deleteMessage: (groupId: string, messageId: string) => void
  addReaction: (groupId: string, messageId: string, emoji: string) => void
  removeReaction: (groupId: string, messageId: string, emoji: string) => void
  
  // Participants
  setParticipant: (participant: ChatParticipant) => void
  removeParticipant: (participantId: string) => void
  setTyping: (groupId: string, userId: string, isTyping: boolean) => void
  
  // Read Status
  markAsRead: (groupId: string) => void
  getTotalUnread: () => number
  
  // Current User
  setCurrentUser: (userId: string, name: string, color: string) => void
  
  // Helpers
  getGroupMessages: (groupId: string) => ChatMessage[]
  getBoardGroup: () => ChatGroup | null
  getDirectGroup: (userId: string) => ChatGroup | null
}

// Default Board-Chat Gruppe
const DEFAULT_BOARD_GROUP: ChatGroup = {
  id: 'board-chat',
  name: 'Board Chat',
  type: 'board',
  memberIds: [],
  createdAt: Date.now(),
  createdBy: 'system',
  unreadCount: 0,
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial State
      isOpen: false,
      activeGroupId: 'board-chat',
      isTyping: new Map(),
      
      groups: new Map([['board-chat', DEFAULT_BOARD_GROUP]]),
      messages: new Map([['board-chat', []]]),
      participants: new Map(),
      
      currentUserId: '',
      currentUserName: '',
      currentUserColor: '#3B82F6',
      
      // UI Actions
      setOpen: (open) => set({ isOpen: open }),
      setActiveGroup: (groupId) => {
        set({ activeGroupId: groupId })
        if (groupId) {
          get().markAsRead(groupId)
        }
      },
      
      // Group Management
      createGroup: (groupData) => {
        const group: ChatGroup = {
          ...groupData,
          id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          unreadCount: 0,
        }
        
        set((state) => {
          const groups = new Map(state.groups)
          groups.set(group.id, group)
          
          const messages = new Map(state.messages)
          messages.set(group.id, [])
          
          return { groups, messages }
        })
        
        return group
      },
      
      updateGroup: (groupId, changes) => set((state) => {
        const groups = new Map(state.groups)
        const group = groups.get(groupId)
        if (group) {
          groups.set(groupId, { ...group, ...changes })
        }
        return { groups }
      }),
      
      deleteGroup: (groupId) => set((state) => {
        const groups = new Map(state.groups)
        groups.delete(groupId)
        
        const messages = new Map(state.messages)
        messages.delete(groupId)
        
        return { 
          groups, 
          messages,
          activeGroupId: state.activeGroupId === groupId ? 'board-chat' : state.activeGroupId,
        }
      }),
      
      joinGroup: (groupId) => set((state) => {
        const groups = new Map(state.groups)
        const group = groups.get(groupId)
        if (group && !group.memberIds.includes(state.currentUserId)) {
          groups.set(groupId, {
            ...group,
            memberIds: [...group.memberIds, state.currentUserId],
          })
        }
        return { groups }
      }),
      
      leaveGroup: (groupId) => set((state) => {
        const groups = new Map(state.groups)
        const group = groups.get(groupId)
        if (group) {
          groups.set(groupId, {
            ...group,
            memberIds: group.memberIds.filter(id => id !== state.currentUserId),
          })
        }
        return { groups }
      }),
      
      // Messages
      addMessage: (groupId, messageData) => {
        const message: ChatMessage = {
          ...messageData,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        }
        
        set((state) => {
          const messages = new Map(state.messages)
          const groupMessages = messages.get(groupId) || []
          messages.set(groupId, [...groupMessages, message])
          
          // Update last message and unread count
          const groups = new Map(state.groups)
          const group = groups.get(groupId)
          if (group) {
            const isOwnMessage = messageData.senderId === state.currentUserId
            const isActiveGroup = state.activeGroupId === groupId && state.isOpen
            
            groups.set(groupId, {
              ...group,
              lastMessage: message,
              unreadCount: isOwnMessage || isActiveGroup ? group.unreadCount : group.unreadCount + 1,
            })
          }
          
          return { messages, groups }
        })
        
        return message
      },
      
      editMessage: (groupId, messageId, content) => set((state) => {
        const messages = new Map(state.messages)
        const groupMessages = messages.get(groupId) || []
        
        messages.set(groupId, groupMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, content, isEdited: true }
            : msg
        ))
        
        return { messages }
      }),
      
      deleteMessage: (groupId, messageId) => set((state) => {
        const messages = new Map(state.messages)
        const groupMessages = messages.get(groupId) || []
        messages.set(groupId, groupMessages.filter(msg => msg.id !== messageId))
        return { messages }
      }),
      
      addReaction: (groupId, messageId, emoji) => set((state) => {
        const messages = new Map(state.messages)
        const groupMessages = messages.get(groupId) || []
        
        messages.set(groupId, groupMessages.map(msg => {
          if (msg.id !== messageId) return msg
          
          const reactions = { ...(msg.reactions || {}) }
          const users = reactions[emoji] || []
          
          if (!users.includes(state.currentUserId)) {
            reactions[emoji] = [...users, state.currentUserId]
          }
          
          return { ...msg, reactions }
        }))
        
        return { messages }
      }),
      
      removeReaction: (groupId, messageId, emoji) => set((state) => {
        const messages = new Map(state.messages)
        const groupMessages = messages.get(groupId) || []
        
        messages.set(groupId, groupMessages.map(msg => {
          if (msg.id !== messageId) return msg
          
          const reactions = { ...(msg.reactions || {}) }
          const users = reactions[emoji] || []
          
          reactions[emoji] = users.filter(id => id !== state.currentUserId)
          if (reactions[emoji].length === 0) {
            delete reactions[emoji]
          }
          
          return { ...msg, reactions }
        }))
        
        return { messages }
      }),
      
      // Participants
      setParticipant: (participant) => set((state) => {
        const participants = new Map(state.participants)
        participants.set(participant.id, participant)
        return { participants }
      }),
      
      removeParticipant: (participantId) => set((state) => {
        const participants = new Map(state.participants)
        participants.delete(participantId)
        return { participants }
      }),
      
      setTyping: (groupId, userId, isTyping) => set((state) => {
        const typingMap = new Map(state.isTyping)
        const groupTyping = typingMap.get(groupId) || []
        
        if (isTyping && !groupTyping.includes(userId)) {
          typingMap.set(groupId, [...groupTyping, userId])
        } else if (!isTyping) {
          typingMap.set(groupId, groupTyping.filter(id => id !== userId))
        }
        
        return { isTyping: typingMap }
      }),
      
      // Read Status
      markAsRead: (groupId) => set((state) => {
        const groups = new Map(state.groups)
        const group = groups.get(groupId)
        if (group) {
          groups.set(groupId, { ...group, unreadCount: 0 })
        }
        return { groups }
      }),
      
      getTotalUnread: () => {
        const state = get()
        let total = 0
        state.groups.forEach(group => {
          total += group.unreadCount
        })
        return total
      },
      
      // Current User
      setCurrentUser: (userId, name, color) => set({
        currentUserId: userId,
        currentUserName: name,
        currentUserColor: color,
      }),
      
      // Helpers
      getGroupMessages: (groupId) => {
        return get().messages.get(groupId) || []
      },
      
      getBoardGroup: () => {
        return get().groups.get('board-chat') || null
      },
      
      getDirectGroup: (userId) => {
        const state = get()
        for (const [, group] of state.groups) {
          if (
            group.type === 'direct' && 
            group.memberIds.includes(userId) && 
            group.memberIds.includes(state.currentUserId)
          ) {
            return group
          }
        }
        return null
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        // Nur bestimmte Daten persistieren
        groups: Array.from(state.groups.entries()),
        messages: Array.from(state.messages.entries()),
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as { 
          groups?: [string, ChatGroup][]
          messages?: [string, ChatMessage[]][] 
        }
        
        return {
          ...current,
          groups: new Map(persistedState.groups || [['board-chat', DEFAULT_BOARD_GROUP]]),
          messages: new Map(persistedState.messages || [['board-chat', []]]),
        }
      },
    }
  )
)
