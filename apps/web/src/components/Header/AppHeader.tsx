import { motion } from 'framer-motion'
import {
  Download,
  Keyboard,
  Users,
  Share2,
  Settings,
  HelpCircle,
  Menu,
} from 'lucide-react'
import { useState } from 'react'

interface AppHeaderProps {
  onExportClick: () => void
  onShortcutsClick: () => void
  onShareClick?: () => void
  onSettingsClick?: () => void
  onHelpClick?: () => void
  boardName?: string
  connectedUsers?: number
}

/**
 * App Header - Fixiert oben
 * Links: Logo + Board-Name
 * Rechts: Export, Shortcuts, Share, Settings
 */
export function AppHeader({
  onExportClick,
  onShortcutsClick,
  onShareClick,
  onSettingsClick,
  onHelpClick,
  boardName = 'Untitled Board',
  connectedUsers = 0,
}: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 h-14 
                 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50"
    >
      <div className="h-full flex items-center justify-between px-4">
        {/* Linke Seite: Logo + Board Name */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 
                           flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 text-white"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <span className="text-white font-semibold hidden sm:block">
              Infinite Canvas
            </span>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-zinc-700 hidden sm:block" />

          {/* Board Name */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-300 text-sm font-medium truncate max-w-[200px]">
              {boardName}
            </span>
            
            {/* Connected Users */}
            {connectedUsers > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 
                             bg-green-500/20 text-green-400 rounded-full text-xs">
                <Users size={12} />
                <span>{connectedUsers}</span>
              </div>
            )}
          </div>
        </div>

        {/* Rechte Seite: Actions */}
        <div className="flex items-center gap-1">
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-1">
            {/* Export */}
            <button
              onClick={onExportClick}
              className="flex items-center gap-2 px-3 py-2 
                        text-zinc-400 hover:text-white hover:bg-zinc-800/50
                        rounded-lg transition-colors text-sm"
              title="Exportieren"
            >
              <Download size={18} />
              <span className="hidden lg:inline">Export</span>
            </button>

            {/* Shortcuts */}
            <button
              onClick={onShortcutsClick}
              className="flex items-center gap-2 px-3 py-2 
                        text-zinc-400 hover:text-white hover:bg-zinc-800/50
                        rounded-lg transition-colors text-sm"
              title="Tastenkürzel"
            >
              <Keyboard size={18} />
              <span className="hidden lg:inline">Shortcuts</span>
            </button>

            {/* Share */}
            {onShareClick && (
              <button
                onClick={onShareClick}
                className="flex items-center gap-2 px-3 py-2 
                          text-zinc-400 hover:text-white hover:bg-zinc-800/50
                          rounded-lg transition-colors text-sm"
                title="Teilen"
              >
                <Share2 size={18} />
                <span className="hidden lg:inline">Share</span>
              </button>
            )}

            {/* Separator */}
            <div className="h-6 w-px bg-zinc-700 mx-1" />

            {/* Help */}
            {onHelpClick && (
              <button
                onClick={onHelpClick}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50
                          rounded-lg transition-colors"
                title="Hilfe"
              >
                <HelpCircle size={18} />
              </button>
            )}

            {/* Settings */}
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50
                          rounded-lg transition-colors"
                title="Einstellungen"
              >
                <Settings size={18} />
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white 
                      hover:bg-zinc-800/50 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden absolute top-full right-4 mt-2 
                    bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl
                    overflow-hidden min-w-[180px]"
        >
          <button
            onClick={() => { onExportClick(); setIsMenuOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 
                      text-zinc-300 hover:text-white hover:bg-zinc-800
                      transition-colors text-left"
          >
            <Download size={18} />
            <span>Exportieren</span>
          </button>
          
          <button
            onClick={() => { onShortcutsClick(); setIsMenuOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 
                      text-zinc-300 hover:text-white hover:bg-zinc-800
                      transition-colors text-left"
          >
            <Keyboard size={18} />
            <span>Tastenkürzel</span>
          </button>

          {onShareClick && (
            <button
              onClick={() => { onShareClick(); setIsMenuOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 
                        text-zinc-300 hover:text-white hover:bg-zinc-800
                        transition-colors text-left"
            >
              <Share2 size={18} />
              <span>Teilen</span>
            </button>
          )}

          <div className="h-px bg-zinc-800" />

          {onHelpClick && (
            <button
              onClick={() => { onHelpClick(); setIsMenuOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 
                        text-zinc-300 hover:text-white hover:bg-zinc-800
                        transition-colors text-left"
            >
              <HelpCircle size={18} />
              <span>Hilfe</span>
            </button>
          )}

          {onSettingsClick && (
            <button
              onClick={() => { onSettingsClick(); setIsMenuOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 
                        text-zinc-300 hover:text-white hover:bg-zinc-800
                        transition-colors text-left"
            >
              <Settings size={18} />
              <span>Einstellungen</span>
            </button>
          )}
        </motion.div>
      )}
    </motion.header>
  )
}

export default AppHeader
