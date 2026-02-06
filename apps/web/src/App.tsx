import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { InfiniteCanvas } from '@/components/Canvas/InfiniteCanvas'
import { UnifiedToolbar } from '@/components/Toolbar/UnifiedToolbar'
import { ProfileMenu } from '@/components/Profile/ProfileMenu'
import { RemoteCursors } from '@/components/Cursors/RemoteCursors'
import { ShareModal } from '@/components/Sharing/ShareModal'
import { HistoryPanel } from '@/components/History/HistoryPanel'
import { ShortcutsModal } from '@/components/Shortcuts/ShortcutsModal'
import { MediaUploadModal } from '@/components/Media/MediaUploadModal'
import { ExportModal } from '@/components/Export/ExportModal'
import { Minimap } from '@/components/Minimap'
import { PresenterBar, PresenterInviteModal } from '@/components/Presenter'
import { WorkspacePanel, WorkspaceModal } from '@/components/Workspaces'
import { LaserSettingsMenu } from '@/components/Laser'
import { ChatPanel, VoiceVideoPanel } from '@/components/Chat'
import { JoinPage, LandingPage, ImpressumPage, DatenschutzPage, DemoPage } from '@/pages'
import { RegisterPage } from '@/pages/RegisterPage'
import { LoginPage } from '@/pages/LoginPage'
import { InvitePage } from '@/pages/InvitePage'
import { AdminPage } from '@/pages/AdminPage'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useToolHotbar } from '@/hooks/useToolHotbar'
import { useExport, ExportOptions } from '@/hooks/useExport'
import { useVoiceVideo } from '@/hooks/useVoiceVideo'
import { useCanvasStore, CanvasObject, WorkspaceRegion } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useUserSettingsStore } from '@/stores/userSettingsStore'
import type { MediaData } from '@/hooks/useMediaUpload'

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
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [workspacePanelOpen, setWorkspacePanelOpen] = useState(false)
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
  const [editingRegion, setEditingRegion] = useState<WorkspaceRegion | null>(null)
  const [draftBounds, setDraftBounds] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  
  const viewport = useCanvasStore((s) => s.viewport)
  const addObject = useCanvasStore((s) => s.addObject)
  const setCurrentUserId = useCanvasStore((s) => s.setCurrentUserId)
  const setUserName = useCanvasStore((s) => s.setUserName)
  const saveToLocalStorage = useCanvasStore((s) => s.saveToLocalStorage)
  const loadFromLocalStorage = useCanvasStore((s) => s.loadFromLocalStorage)
  const objects = useCanvasStore((s) => s.objects)
  
  // Chat store
  const setChatUser = useChatStore((s) => s.setCurrentUser)
  const setChatParticipant = useChatStore((s) => s.setParticipant)
  
  const profileCursorColor = useUserSettingsStore((s) => s.profile.cursorColor)

  // Generate a user color based on ID
  const userColor = profileCursorColor ?? `hsl(${parseInt(guestId.slice(-6), 16) % 360}, 70%, 50%)`
  
  // Set current user ID and name in store
  useEffect(() => {
    setCurrentUserId(guestId)
    setUserName(guestId, guestName)
    setChatUser(guestId, guestName, userColor)
    setChatParticipant({
      id: guestId,
      name: guestName,
      color: userColor,
      isOnline: true,
    })
  }, [guestId, guestName, setCurrentUserId, setUserName, setChatUser, setChatParticipant, userColor])
  
  // Update user name when changed
  useEffect(() => {
    setUserName(guestId, guestName)
  }, [guestName, guestId, setUserName])

  // Workspace-Region Draft vom Board (Ziehen)
  useEffect(() => {
    const handleDraft = (e: CustomEvent<{ x1: number; y1: number; x2: number; y2: number }>) => {
      setEditingRegion(null)
      setDraftBounds(e.detail)
      setWorkspaceModalOpen(true)
    }
    window.addEventListener('workspace_region:draft', handleDraft as EventListener)
    return () => window.removeEventListener('workspace_region:draft', handleDraft as EventListener)
  }, [])
  
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
  
  // Initialize keyboard shortcuts (handles all shortcuts including undo/redo)
  useKeyboardShortcuts({
    enabled: true,
    onShowShortcuts: () => setShortcutsOpen(true),
  })
  
  // Export functionality
  const { downloadExport, copyToClipboard } = useExport()
  
  // Tool Hotbar (1-9, 0 keyboard shortcuts)
  useToolHotbar()
  
  const { 
    isConnected, 
    remoteUsers, 
    wsRef,
    sendCursorMove,
    sendObjectCreate,
    sendObjectUpdate,
    sendChatMessage,
    sendChatTyping,
  } = useWebSocket({
    boardId,
    userId: guestId,
    displayName: guestName,
  })

  const {
    isInCall,
    isAudioEnabled,
    isVideoEnabled,
    participants: callParticipants,
    currentChannelId,
    channels,
    incomingCall,
    activeSpeakerId,
    lastSpeakerId,
    audioDevices,
    selectedMicId,
    audioSettings,
    vipSpeakerId,
    muteOthers,
    startCall,
    joinCall,
    endCall,
    toggleAudio,
    toggleVideo,
    declineCall,
    createChannel,
    joinChannel,
    moveParticipant,
    setVipSpeaker,
    toggleMuteOthers,
    setParticipantVolume,
    toggleParticipantMute,
    setAudioDevice,
    updateAudioSettings,
  } = useVoiceVideo({
    boardId,
    userId: guestId,
    userName: guestName,
    userColor,
    wsRef,
  })
  
  const handleShareClick = () => {
    setShareModalOpen(true)
  }
  
  // Handle media upload - creates a canvas object from the uploaded media
  const handleMediaAdd = useCallback((mediaData: MediaData, type: 'image' | 'video' | 'audio') => {
    // Calculate position in center of current viewport
    const centerX = (-viewport.x + window.innerWidth / 2) / viewport.scale
    const centerY = (-viewport.y + window.innerHeight / 2) / viewport.scale
    
    // Default sizes based on type
    let width = 300
    let height = 200
    
    if (type === 'image' && mediaData.aspectRatio) {
      // Maintain aspect ratio for images
      height = width / mediaData.aspectRatio
    } else if (type === 'audio') {
      // Audio player is compact
      width = 300
      height = 80
    }
    
    const newObject: CanvasObject = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      data: {
        src: mediaData.src,
        mimeType: mediaData.mimeType,
        originalName: mediaData.originalName,
        fileSize: mediaData.fileSize,
        aspectRatio: mediaData.aspectRatio,
        duration: mediaData.duration,
        sourceType: mediaData.sourceType ?? 'upload',
        externalUrl: mediaData.externalUrl,
        embedUrl: mediaData.embedUrl,
        provider: mediaData.provider,
        youtubeId: mediaData.youtubeId,
        isPlaying: false,
        currentTime: 0,
        volume: 1,
      },
      createdAt: Date.now(),
    }
    
    addObject(newObject)
    sendObjectCreate(newObject)
  }, [viewport, addObject, sendObjectCreate])
  
  // Handle export download
  const handleExport = useCallback(async (options: ExportOptions) => {
    await downloadExport(options)
    setExportModalOpen(false)
  }, [downloadExport])
  
  // Handle copy to clipboard
  const handleCopyExport = useCallback(async (options: ExportOptions) => {
    await copyToClipboard(options)
  }, [copyToClipboard])
  
  return (
    <div className="canvas-page relative w-full h-full bg-canvas-bg overflow-hidden">
      {/* Main Canvas */}
      <InfiniteCanvas 
        onCursorMove={sendCursorMove}
        onObjectCreate={sendObjectCreate}
        onObjectUpdate={sendObjectUpdate}
      />
      
      {/* Remote Cursors Overlay */}
      <RemoteCursors 
        users={remoteUsers}
        viewportX={viewport.x}
        viewportY={viewport.y}
        scale={viewport.scale}
      />
      
      {/* Unified Toolbar - Bottom Center */}
      <UnifiedToolbar 
        onHistoryClick={() => setHistoryOpen(true)} 
        onMediaClick={() => setMediaModalOpen(true)}
        onWorkspaceClick={() => setWorkspacePanelOpen(true)}
      />
      
      {/* Minimap - Top Left */}
      <Minimap 
        position="top-left" 
        isConnected={isConnected}
        onlineCount={remoteUsers.size + 1}
      />
      
      {/* Profile Menu - Top Right */}
      <ProfileMenu 
        displayName={guestName}
        isConnected={isConnected}
        onlineCount={remoteUsers.size + 1}
        onChangeName={setGuestName}
        onShareClick={handleShareClick}
        onShortcutsClick={() => setShortcutsOpen(true)}
        onExportClick={() => setExportModalOpen(true)}
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
      
      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      
      {/* Media Upload Modal */}
      <MediaUploadModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onMediaAdd={handleMediaAdd}
      />
      
      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
        onCopy={handleCopyExport}
      />
      
      {/* Presenter Bar - Phase 4 */}
      <PresenterBar />
      
      {/* Presenter Invite Modal - zeigt Einladung wenn jemand präsentiert */}
      <PresenterInviteModal />
      
      {/* Laser Settings Menu - zeigt Optionen wenn Laser-Tool aktiv */}
      <LaserSettingsMenu />
      
      {/* Chat Panel - Board Chat, Gruppen, DMs */}
      <ChatPanel
        onSendMessage={sendChatMessage}
        onTyping={sendChatTyping}
      />

      <VoiceVideoPanel
        isInCall={isInCall}
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        participants={callParticipants}
        currentUserId={guestId}
        incomingCall={incomingCall}
        currentChannelId={currentChannelId}
        channels={channels}
        activeSpeakerId={activeSpeakerId}
        lastSpeakerId={lastSpeakerId}
        audioDevices={audioDevices}
        selectedMicId={selectedMicId}
        audioSettings={audioSettings}
        vipSpeakerId={vipSpeakerId}
        muteOthers={muteOthers}
        onStartCall={startCall}
        onJoinCall={joinCall}
        onEndCall={endCall}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onDeclineCall={declineCall}
        onCreateChannel={createChannel}
        onJoinChannel={joinChannel}
        onMoveParticipant={moveParticipant}
        onSetVipSpeaker={setVipSpeaker}
        onToggleMuteOthers={toggleMuteOthers}
        onSetParticipantVolume={setParticipantVolume}
        onToggleParticipantMute={toggleParticipantMute}
        onSelectMic={setAudioDevice}
        onUpdateAudioSettings={updateAudioSettings}
      />
      
      {/* Workspace Panel - Phase 4 */}
      <WorkspacePanel
        isOpen={workspacePanelOpen}
        onClose={() => setWorkspacePanelOpen(false)}
        onCreateNew={() => {
          setEditingRegion(null)
          setDraftBounds(null)
          setWorkspaceModalOpen(true)
        }}
        onEditRegion={(region) => {
          setEditingRegion(region)
          setDraftBounds(null)
          setWorkspaceModalOpen(true)
        }}
      />
      
      {/* Workspace Modal - Phase 4 */}
      <WorkspaceModal
        isOpen={workspaceModalOpen}
        onClose={() => {
          setWorkspaceModalOpen(false)
          setEditingRegion(null)
          setDraftBounds(null)
        }}
        editRegion={editingRegion}
        initialBounds={draftBounds || undefined}
      />
      
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

// Get basename for GitHub Pages
const getBasename = () => {
  // Check if running on GitHub Pages
  if (import.meta.env.PROD && window.location.hostname.includes('github.io')) {
    return '/krasserUndKreativer'
  }
  return ''
}

export default function App() {
  // Handle SPA redirect from 404.html
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const route = params.get('route')
    if (route) {
      // Clean up the URL and navigate
      window.history.replaceState(null, '', getBasename() + route)
    }
  }, [])

  return (
    <BrowserRouter basename={getBasename()}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/playground" element={<DemoPage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/datenschutz" element={<DatenschutzPage />} />
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
