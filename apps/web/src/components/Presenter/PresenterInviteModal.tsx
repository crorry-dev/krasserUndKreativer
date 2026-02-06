import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, X, Eye } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvasStore'

/**
 * Modal/Notification für Presenter-Einladungen
 * Zeigt an, wenn jemand anfängt zu präsentieren
 * User kann folgen oder ablehnen
 */
export function PresenterInviteModal() {
  const presenterState = useCanvasStore((s) => s.presenterState)
  const followPresenter = useCanvasStore((s) => s.followPresenter)
  const dismissPresenterInvite = useCanvasStore((s) => s.dismissPresenterInvite)
  const userNames = useCanvasStore((s) => s.userNames)
  
  const [isVisible, setIsVisible] = useState(false)
  
  // Zeige Modal wenn eine Einladung pending ist
  useEffect(() => {
    if (presenterState.invitePending && presenterState.presenter) {
      setIsVisible(true)
    }
  }, [presenterState.invitePending, presenterState.presenter])
  
  // Presenter-Name ermitteln
  const presenterName = presenterState.presenter
    ? userNames.get(presenterState.presenter.id) || presenterState.presenter.name
    : 'Jemand'
  
  const handleFollow = () => {
    followPresenter(true)
    dismissPresenterInvite(false)
    setIsVisible(false)
  }
  
  const handleDecline = () => {
    dismissPresenterInvite(true)
    setIsVisible(false)
  }
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto"
        >
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-4 min-w-[320px] max-w-[400px]">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm">
                  Präsentation gestartet
                </h3>
                <p className="text-gray-400 text-xs">
                  <span className="text-blue-400 font-medium">{presenterName}</span> präsentiert jetzt
                </p>
              </div>
              <button
                onClick={handleDecline}
                className="w-8 h-8 rounded-full hover:bg-gray-700/50 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            {/* Info Text */}
            <p className="text-gray-300 text-sm mb-4 pl-[52px]">
              Möchtest du der Präsentation folgen? Dein Viewport wird automatisch synchronisiert.
            </p>
            
            {/* Actions */}
            <div className="flex gap-2 pl-[52px]">
              <button
                onClick={handleFollow}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm transition-colors"
              >
                <Users className="w-4 h-4" />
                Folgen
              </button>
              <button
                onClick={handleDecline}
                className="px-4 py-2.5 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-xl font-medium text-sm transition-colors"
              >
                Nicht jetzt
              </button>
            </div>
            
            {/* Hint */}
            <p className="text-gray-500 text-xs mt-3 pl-[52px]">
              Du kannst später über das Profilmenü beitreten
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
