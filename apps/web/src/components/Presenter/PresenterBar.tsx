import { motion } from 'framer-motion'
import { Mic, MicOff, Users, Crown, Eye, EyeOff, Lock } from 'lucide-react'
import { usePresenterMode } from '../../hooks/usePresenterMode'

export function PresenterBar() {
  const {
    isPresenting,
    isFollowing,
    presenterName,
    followerCount,
    stopPresenting,
    followPresenter,
    hasPresenter,
    isCurrentUserPresenter,
  } = usePresenterMode()
  
  // If presenting, show presenter controls
  if (isPresenting) {
    return (
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg shadow-purple-500/25">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Mic className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <span className="font-medium">Du präsentierst</span>
          </div>
          
          <div className="w-px h-6 bg-white/30" />
          
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">
              {followerCount} {followerCount === 1 ? 'folgt' : 'folgen'}
            </span>
          </div>
          
          <button
            onClick={stopPresenting}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
          >
            <MicOff className="w-4 h-4" />
            Beenden
          </button>
        </div>
      </motion.div>
    )
  }
  
  // If following someone, show follower bar with unfollow option
  if (isFollowing && hasPresenter) {
    return (
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-lg shadow-blue-500/25">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Eye className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <span className="font-medium">Du folgst {presenterName}</span>
          </div>
          
          <div className="w-px h-6 bg-white/30" />
          
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Navigation gesperrt</span>
          </div>
          
          <button
            onClick={() => followPresenter(false)}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-red-500/50 rounded-full text-sm font-medium transition-colors"
          >
            <EyeOff className="w-4 h-4" />
            Nicht mehr folgen
          </button>
        </div>
      </motion.div>
    )
  }
  
  // If someone else is presenting (and we're not following), show follow prompt
  // WICHTIG: Nicht anzeigen wenn der aktuelle User selbst der Presenter ist!
  if (hasPresenter && !isCurrentUserPresenter) {
    return (
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-3 px-5 py-3 bg-black/80 backdrop-blur-xl text-white rounded-full shadow-lg border border-white/10">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="font-medium">{presenterName} präsentiert</span>
          </div>
          
          <div className="w-px h-6 bg-white/20" />
          
          <button
            onClick={() => followPresenter(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-full text-sm font-medium transition-all"
          >
            <Eye className="w-4 h-4" />
            Folgen
          </button>
        </div>
      </motion.div>
    )
  }
  
  // No one is presenting - show start presenting button (integrated elsewhere, not shown here)
  return null
}

/**
 * Button zum Starten einer Präsentation
 * Kann in Toolbar oder Menü eingebunden werden
 */
export function StartPresentingButton() {
  const { startPresenting, canPresent, isPresenting } = usePresenterMode()
  
  if (!canPresent || isPresenting) return null
  
  return (
    <button
      onClick={startPresenting}
      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors"
      title="Präsentation starten"
    >
      <Mic className="w-4 h-4" />
      <span className="text-sm font-medium">Präsentieren</span>
    </button>
  )
}
