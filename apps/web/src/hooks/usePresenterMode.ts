import { useCallback, useEffect, useRef } from 'react'
import { useCanvasStore, Viewport } from '../stores/canvasStore'

/**
 * Hook für Presenter Mode Funktionalität
 * Ermöglicht einem User, als Presenter alle anderen durch das Board zu führen
 * 
 * WICHTIG: Follower sehen exakt das was der Presenter sieht - 
 * direkte Viewport-Synchronisation ohne Verzögerung!
 */
export function usePresenterMode() {
  const presenterState = useCanvasStore((s) => s.presenterState)
  const followPresenter = useCanvasStore((s) => s.followPresenter)
  const updatePresenterViewport = useCanvasStore((s) => s.updatePresenterViewport)
  const setPresenter = useCanvasStore((s) => s.setPresenter)
  const setViewport = useCanvasStore((s) => s.setViewport)
  const currentUserId = useCanvasStore((s) => s.currentUserId)
  const userNames = useCanvasStore((s) => s.userNames)
  
  const lastViewportRef = useRef<Viewport | null>(null)
  
  /**
   * Start presenting - broadcast viewport to followers via WebSocket
   */
  const handleStartPresenting = useCallback(() => {
    // Trigger WebSocket Event - der useWebSocket Hook hört darauf
    window.dispatchEvent(new CustomEvent('presenter:start'))
  }, [])
  
  /**
   * Stop presenting
   */
  const handleStopPresenting = useCallback(() => {
    // Trigger WebSocket Event
    window.dispatchEvent(new CustomEvent('presenter:end'))
  }, [])
  
  /**
   * Toggle following presenter
   */
  const handleFollowPresenter = useCallback((follow: boolean) => {
    followPresenter(follow)
    // ws.send(JSON.stringify({ type: 'follow_presenter', userId: currentUserId, follow }))
  }, [followPresenter])
  
  /**
   * Broadcast viewport when presenting via WebSocket
   */
  useEffect(() => {
    if (!presenterState.isPresenting) return
    
    const interval = setInterval(() => {
      const currentViewport = useCanvasStore.getState().viewport
      
      // Nur senden wenn sich der Viewport geändert hat
      if (
        lastViewportRef.current &&
        lastViewportRef.current.x === currentViewport.x &&
        lastViewportRef.current.y === currentViewport.y &&
        lastViewportRef.current.scale === currentViewport.scale
      ) {
        return
      }
      
      lastViewportRef.current = { ...currentViewport }
      
      // Viewport via WebSocket an andere Clients senden
      window.dispatchEvent(new CustomEvent('presenter:viewport', { detail: currentViewport }))
      
      // Auch lokal im Store speichern für lokale Follower
      updatePresenterViewport(currentViewport)
    }, 33) // ~30fps für smootheres Following
    
    return () => clearInterval(interval)
  }, [presenterState.isPresenting, updatePresenterViewport])
  
  /**
   * Follow presenter viewport - DIREKTE Synchronisation!
   * Follower bekommen exakt den Viewport des Presenters - keine Interpolation,
   * keine Verzögerung. Der Presenter sendet mit ~30fps, wir übernehmen direkt.
   */
  useEffect(() => {
    if (!presenterState.isFollowing || !presenterState.presenterViewport) {
      return
    }
    
    // DIREKTE Viewport-Übernahme - exakt was der Presenter sieht
    setViewport(presenterState.presenterViewport)
  }, [presenterState.isFollowing, presenterState.presenterViewport, setViewport])
  
  // Get presenter name
  const presenterName = presenterState.presenter
    ? userNames.get(presenterState.presenter.id) || presenterState.presenter.name
    : null
  
  // Current user's name for display
  const currentUserName = userNames.get(currentUserId) || 'Du'
  
  // Ist der aktuelle User der Presenter? (sollte sich nicht selbst folgen können)
  const isCurrentUserPresenter = presenterState.presenter?.id === currentUserId
  
  return {
    // State
    isPresenting: presenterState.isPresenting,
    isFollowing: presenterState.isFollowing,
    presenter: presenterState.presenter,
    presenterName,
    followerCount: presenterState.followerIds.size,
    currentUserName,
    
    // Actions
    startPresenting: handleStartPresenting,
    stopPresenting: handleStopPresenting,
    followPresenter: handleFollowPresenter,
    setPresenter,
    
    // Helpers
    canPresent: !presenterState.presenter || presenterState.isPresenting,
    hasPresenter: presenterState.presenter !== null,
    isCurrentUserPresenter, // NEU: Um zu prüfen ob User sich selbst folgen würde
  }
}
