import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  X, 
  Send, 
  Users, 
  Plus, 
  Hash, 
  AtSign,
  Smile,
  Reply,
  Edit2,
  Trash2,
  Video,
  Phone,
  MapPin,
} from 'lucide-react'
import { useChatStore, ChatMessage } from '../../stores/chatStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

// Quick emoji reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

interface ChatPanelProps {
  onSendMessage?: (groupId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  onTyping?: (groupId: string, isTyping: boolean) => void
}

/**
 * Chat-Panel Komponente
 * Slide-in Panel von rechts mit Board-Chat, Gruppen und DMs
 */
export function ChatPanel({ onSendMessage, onTyping }: ChatPanelProps) {
  const {
    isOpen,
    setOpen,
    activeGroupId,
    setActiveGroup,
    groups,
    messages,
    participants,
    currentUserId,
    currentUserName,
    currentUserColor,
    isTyping,
    addMessage,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
    getTotalUnread,
  } = useChatStore()

  const viewport = useCanvasStore((s) => s.viewport)
  const setViewport = useCanvasStore((s) => s.setViewport)
  
  const [inputValue, setInputValue] = useState('')
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null)
  const [showGroupList, setShowGroupList] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<number | null>(null)
  const isTypingRef = useRef(false)
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeGroupId])
  
  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Typing Indicator (WebSocket)
  useEffect(() => {
    if (!activeGroupId || !onTyping) return
    const hasText = inputValue.trim().length > 0

    if (!hasText) {
      if (isTypingRef.current) {
        onTyping(activeGroupId, false)
        isTypingRef.current = false
      }
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      return
    }

    if (!isTypingRef.current) {
      onTyping(activeGroupId, true)
      isTypingRef.current = true
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      if (isTypingRef.current) {
        onTyping(activeGroupId, false)
        isTypingRef.current = false
      }
    }, 1200)

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [inputValue, activeGroupId, onTyping])

  // Cleanup: Typing-Status beim Gruppenwechsel/Unmount zurücksetzen
  useEffect(() => {
    return () => {
      if (activeGroupId && onTyping && isTypingRef.current) {
        onTyping(activeGroupId, false)
        isTypingRef.current = false
      }
    }
  }, [activeGroupId, onTyping])
  
  // Handle send message
  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !activeGroupId) return
    
    if (editingMessage) {
      editMessage(activeGroupId, editingMessage.id, inputValue.trim())
      setEditingMessage(null)
    } else {
      const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        senderId: currentUserId,
        senderName: currentUserName,
        senderColor: currentUserColor,
        content: inputValue.trim(),
        type: 'text',
        replyTo: replyingTo?.id,
      }
      addMessage(activeGroupId, newMessage)
      onSendMessage?.(activeGroupId, newMessage)
      setReplyingTo(null)
    }
    
    setInputValue('')
    if (activeGroupId && onTyping && isTypingRef.current) {
      onTyping(activeGroupId, false)
      isTypingRef.current = false
    }
  }, [inputValue, activeGroupId, currentUserId, currentUserName, currentUserColor, replyingTo, editingMessage, addMessage, editMessage, onSendMessage, onTyping])
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      setReplyingTo(null)
      setEditingMessage(null)
    }
  }
  
  // Get active group messages
  const activeMessages = activeGroupId ? messages.get(activeGroupId) || [] : []
  const activeGroup = activeGroupId ? groups.get(activeGroupId) : null
  const typingUsers = activeGroupId ? isTyping.get(activeGroupId) || [] : []

  const handleShareLocation = useCallback(() => {
    if (!activeGroupId) return

    const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      senderId: currentUserId,
      senderName: currentUserName,
      senderColor: currentUserColor,
      content: 'Standort geteilt',
      type: 'location',
      location: {
        x: viewport.x,
        y: viewport.y,
        scale: viewport.scale,
      },
    }

    addMessage(activeGroupId, newMessage)
    onSendMessage?.(activeGroupId, newMessage)
  }, [activeGroupId, currentUserId, currentUserName, currentUserColor, viewport.x, viewport.y, viewport.scale, addMessage, onSendMessage])
  
  // Render message
  const renderMessage = (msg: ChatMessage) => {
    const isOwnMessage = msg.senderId === currentUserId
    const replyToMessage = msg.replyTo 
      ? activeMessages.find(m => m.id === msg.replyTo) 
      : null
    
    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`group flex gap-2 mb-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      >
        {/* Avatar */}
        <div 
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium"
          style={{ backgroundColor: msg.senderColor }}
        >
          {msg.senderName.charAt(0).toUpperCase()}
        </div>
        
        {/* Message Content */}
        <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : ''}`}>
          {/* Reply Preview */}
          {replyToMessage && (
            <div className="text-xs text-gray-500 mb-1 pl-2 border-l-2 border-gray-600 truncate">
              <Reply className="w-3 h-3 inline mr-1" />
              {replyToMessage.senderName}: {replyToMessage.content.slice(0, 30)}...
            </div>
          )}
          
          {/* Sender Name */}
          {!isOwnMessage && (
            <span className="text-xs text-gray-400 mb-1">{msg.senderName}</span>
          )}
          
          {/* Message Bubble */}
          <div 
            className={`relative px-3 py-2 rounded-xl ${
              isOwnMessage 
                ? 'bg-blue-600 text-white rounded-br-sm' 
                : 'bg-gray-700 text-white rounded-bl-sm'
            }`}
          >
            {msg.type === 'location' && msg.location ? (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">{msg.content}</div>
                <button
                  onClick={() => setViewport({ ...msg.location })}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black/20 hover:bg-black/30 rounded-lg text-xs font-medium transition-colors"
                  aria-label="Zum Standort springen"
                >
                  <MapPin className="w-4 h-4" aria-hidden />
                  Zum Standort springen
                </button>
                <div className="text-[10px] text-white/60">
                  Zoom: {msg.location.scale.toFixed(2)}
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
            )}
            
            {/* Message Actions (on hover) */}
            <div className={`absolute ${isOwnMessage ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
              <button 
                onClick={() => setReplyingTo(msg)}
                className="p-1 bg-gray-800 rounded hover:bg-gray-700"
              >
                <Reply className="w-3 h-3" />
              </button>
              <button 
                onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                className="p-1 bg-gray-800 rounded hover:bg-gray-700"
              >
                <Smile className="w-3 h-3" />
              </button>
              {isOwnMessage && (
                <>
                  <button 
                    onClick={() => {
                      setEditingMessage(msg)
                      setInputValue(msg.content)
                    }}
                    className="p-1 bg-gray-800 rounded hover:bg-gray-700"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => activeGroupId && deleteMessage(activeGroupId, msg.id)}
                    className="p-1 bg-gray-800 rounded hover:bg-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
            
            {/* Quick Emoji Picker */}
            <AnimatePresence>
              {showEmojiPicker === msg.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`absolute ${isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'} top-0 bg-gray-800 rounded-lg p-1 flex gap-1 z-10`}
                >
                  {QUICK_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        if (activeGroupId) {
                          addReaction(activeGroupId, msg.id, emoji)
                        }
                        setShowEmojiPicker(null)
                      }}
                      className="p-1 hover:bg-gray-700 rounded text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Reactions */}
          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {Object.entries(msg.reactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => {
                    if (!activeGroupId) return
                    if (users.includes(currentUserId)) {
                      removeReaction(activeGroupId, msg.id, emoji)
                    } else {
                      addReaction(activeGroupId, msg.id, emoji)
                    }
                  }}
                  className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                    users.includes(currentUserId) 
                      ? 'bg-blue-600/30 border border-blue-500' 
                      : 'bg-gray-700'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-gray-400">{users.length}</span>
                </button>
              ))}
            </div>
          )}
          
          {/* Timestamp & Edited */}
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-gray-500">
              {formatDistanceToNow(msg.timestamp, { addSuffix: true, locale: de })}
            </span>
            {msg.isEdited && (
              <span className="text-[10px] text-gray-500">(bearbeitet)</span>
            )}
          </div>
        </div>
      </motion.div>
    )
  }
  
  // Chat Button (when closed)
  if (!isOpen) {
    const unreadCount = getTotalUnread()
    
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-12 h-12 bg-gray-800/90 backdrop-blur-md rounded-full border border-gray-700 flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg"
      >
        <MessageSquare className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    )
  }
  
  return (
    <>
      {/* Chat Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-80 sm:w-96 bg-gray-900/95 backdrop-blur-md border-l border-gray-700 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGroupList(!showGroupList)}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-medium text-white">
                {activeGroup?.name || 'Chat'}
              </h3>
              <p className="text-xs text-gray-400">
                {activeGroup?.type === 'board' 
                  ? `${participants.size} online` 
                  : `${activeGroup?.memberIds.length || 0} Mitglieder`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Voice/Video Call Buttons (Placeholder) */}
            <button className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white">
              <Video className="w-5 h-5" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Group List (Sidebar) */}
        <AnimatePresence>
          {showGroupList && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-gray-700 overflow-hidden"
            >
              <div className="p-2 max-h-48 overflow-y-auto">
                {/* Board Chat */}
                <button
                  onClick={() => {
                    setActiveGroup('board-chat')
                    setShowGroupList(false)
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    activeGroupId === 'board-chat' ? 'bg-blue-600/20' : 'hover:bg-gray-800'
                  }`}
                >
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 text-left text-sm">Board Chat</span>
                  {groups.get('board-chat')?.unreadCount ? (
                    <span className="w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                      {groups.get('board-chat')?.unreadCount}
                    </span>
                  ) : null}
                </button>
                
                {/* Other Groups */}
                {Array.from(groups.values())
                  .filter(g => g.id !== 'board-chat')
                  .map(group => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setActiveGroup(group.id)
                        setShowGroupList(false)
                      }}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        activeGroupId === group.id ? 'bg-blue-600/20' : 'hover:bg-gray-800'
                      }`}
                    >
                      {group.type === 'direct' ? (
                        <AtSign className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Users className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="flex-1 text-left text-sm truncate">{group.name}</span>
                      {group.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                          {group.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                }
                
                {/* New Group Button (TODO: Modal implementieren) */}
                <button
                  onClick={() => {
                    // TODO: Gruppen-Modal öffnen
                    console.log('Neue Gruppe erstellen')
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Neue Gruppe</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3">
          {activeMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Noch keine Nachrichten. Schreibe die erste!
            </div>
          ) : (
            activeMessages.map((msg) => renderMessage(msg))
          )}
          
          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span>
                {typingUsers.length === 1 
                  ? `${participants.get(typingUsers[0])?.name || 'Jemand'} tippt...`
                  : `${typingUsers.length} Personen tippen...`
                }
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-3 py-2 bg-gray-800/50 border-t border-gray-700 flex items-center gap-2">
            <Reply className="w-4 h-4 text-blue-400" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-blue-400">{replyingTo.senderName}</span>
              <p className="text-xs text-gray-400 truncate">{replyingTo.content}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-700 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Edit Preview */}
        {editingMessage && (
          <div className="px-3 py-2 bg-yellow-600/20 border-t border-yellow-600/50 flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-yellow-400" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-yellow-400">Nachricht bearbeiten</span>
            </div>
            <button onClick={() => {
              setEditingMessage(null)
              setInputValue('')
            }} className="p-1 hover:bg-gray-700 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Input */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareLocation}
              className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
              aria-label="Standort teilen"
            >
              <MapPin className="w-5 h-5 text-white" aria-hidden />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nachricht schreiben..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
      />
    </>
  )
}

export default ChatPanel
