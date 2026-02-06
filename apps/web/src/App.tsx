import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { InfiniteCanvas } from '@/components/Canvas/InfiniteCanvas'
import { RadialMenu } from '@/components/Toolbar/RadialMenu'
import { ProfileMenu } from '@/components/Profile/ProfileMenu'
import { RemoteCursors } from '@/components/Cursors/RemoteCursors'
import { ShareModal } from '@/components/Sharing/ShareModal'
import { HistoryPanel } from '@/components/History/HistoryPanel'
import { JoinPage, LandingPage } from '@/pages'
import { RegisterPage } from '@/pages/RegisterPage'
import { LoginPage } from '@/pages/LoginPage'
import { InvitePage } from '@/pages/InvitePage'
import { AdminPage } from '@/pages/AdminPage'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'

// Generate a simple guest ID
const getGuestId = () => {
  let id = localStorage.getItem('guest_id')
  if (!id) {
    id = `guest-${Math.random().toString(36).substring(2, 10)}`
    localStorage.setItem('guest_id', id)
  }
  return id
}

const getGuestName = () => {
  const adjectives = ['Happy', 'Swift', 'Clever', 'Bright', 'Cool', 'Chill', 'Wild', 'Zen']
  const animals = ['Panda', 'Fox', 'Owl', 'Tiger', 'Wolf', 'Bear', 'Eagle', 'Dolphin']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const animal = animals[Math.floor(Math.random() * animals.length)]
  return `${adj} ${animal}`
}

function BoardPage() {
  const { boardId: urlBoardId } = useParams<{ boardId: string }>()
  const boardId = urlBoardId || 'demo-board'
  
  const [guestId] = useState(getGuestId)
  const [guestName, setGuestName] = useState(() => {
    let name = localStorage.getItem('guest_name')
    if (!name) {
      name = getGuestName()
      localStorage.setItem('guest_name', name)
    }
    return name
  })
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  
  const viewport = useCanvasStore((s) => s.viewport)
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const canUndo = useCanvasStore((s) => s.canUndo)
  const canRedo = useCanvasStore((s) => s.canRedo)
  const setCurrentUserId = useCanvasStore((s) => s.setCurrentUserId)
  const setUserName = useCanvasStore((s) => s.setUserName)
  const saveToLocalStorage = useCanvasStore((s) => s.saveToLocalStorage)
  const loadFromLocalStorage = useCanvasStore((s) => s.loadFromLocalStorage)
  const objects = useCanvasStore((s) => s.objects)
  
  // Set current user ID and name in store
  useEffect(() => {
    setCurrentUserId(guestId)
    setUserName(guestId, guestName)
  }, [guestId, guestName, setCurrentUserId, setUserName])
  
  // Update user name when changed
  useEffect(() => {
    setUserName(guestId, guestName)
  }, [guestName, guestId, setUserName])
  
  // Load board from localStorage on mount
  useEffect(() => {
    const loaded = loadFromLocalStorage()
    if (loaded) {
      console.log('Board aus localStorage geladen')
    }
  }, [loadFromLocalStorage])
  
  // Auto-save to localStorage when objects change
  useEffect(() => {
    // Debounce saving to prevent too frequent writes
    const timeoutId = setTimeout(() => {
      if (objects.size > 0) {
        saveToLocalStorage()
      }
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [objects, saveToLocalStorage])
  
  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo()) {
          undo()
        }
      }
      
      // Cmd/Ctrl + Shift + Z = Redo (or Cmd/Ctrl + Y)
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault()
        if (canRedo()) {
          redo()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, canUndo, canRedo])
  
  const { 
    isConnected, 
    remoteUsers, 
    sendCursorMove,
    sendObjectCreate,
  } = useWebSocket({
    boardId,
    userId: guestId,
    displayName: guestName,
  })
  
  const handleShareClick = () => {
    setShareModalOpen(true)
  }
  
  return (
    <div className="relative w-full h-full bg-canvas-bg overflow-hidden">
      {/* Main Canvas */}
      <InfiniteCanvas 
        onCursorMove={sendCursorMove}
        onObjectCreate={sendObjectCreate}
      />
      
      {/* Remote Cursors Overlay */}
      <RemoteCursors 
        users={remoteUsers}
        viewportX={viewport.x}
        viewportY={viewport.y}
        scale={viewport.scale}
      />
      
      {/* Radial Tool Menu - Bottom Left */}
      <RadialMenu onHistoryClick={() => setHistoryOpen(true)} />
      
      {/* Profile Menu - Top Right */}
      <ProfileMenu 
        displayName={guestName}
        isConnected={isConnected}
        onlineCount={remoteUsers.size + 1}
        onChangeName={setGuestName}
        onShareClick={handleShareClick}
        remoteUsers={remoteUsers}
      />
      
      {/* Share Modal */}
      <ShareModal 
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        boardId={boardId}
      />
      
      {/* History Panel */}
      <HistoryPanel
        boardId={boardId}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
      
      {/* Coordinates display - Bottom Right */}
      <div className="fixed bottom-6 right-6 text-xs text-white/40 font-mono bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
        {Math.round(-viewport.x / viewport.scale)}, {Math.round(-viewport.y / viewport.scale)}
      </div>
    </div>
  )
}

// Wrapper for the canvas to check auth and redirect
function CanvasWrapper() {
  const { user, token, fetchMe } = useAuthStore()
  
  useEffect(() => {
    if (token && !user) {
      fetchMe()
    }
  }, [token, user, fetchMe])
  
  // For now, allow guest access too
  return <BoardPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/canvas" element={<CanvasWrapper />} />
        <Route path="/board/:boardId" element={<BoardPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
      </Routes>
    </BrowserRouter>
  )
}
