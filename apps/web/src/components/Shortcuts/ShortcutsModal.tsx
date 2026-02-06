import { motion, AnimatePresence } from 'framer-motion'
import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts'

// SVG Icons
const XIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const KeyboardIcon = () => (
  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6M9 13h3" />
  </svg>
)

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const cmdKey = isMac ? '⌘' : 'Ctrl'
  
  const categories = [
    { 
      id: 'tools', 
      title: 'Werkzeuge', 
      shortcuts: SHORTCUTS.tools.map(s => ({
        keys: [s.key],
        description: s.description,
      }))
    },
    { 
      id: 'edit', 
      title: 'Bearbeiten', 
      shortcuts: [
        { keys: [cmdKey, 'Z'], description: 'Rückgängig' },
        { keys: [cmdKey, 'Shift', 'Z'], description: 'Wiederholen' },
        { keys: [cmdKey, 'C'], description: 'Kopieren' },
        { keys: [cmdKey, 'V'], description: 'Einfügen' },
        { keys: [cmdKey, 'X'], description: 'Ausschneiden' },
        { keys: [cmdKey, 'D'], description: 'Duplizieren' },
        { keys: [cmdKey, 'A'], description: 'Alles auswählen' },
        { keys: ['Delete'], description: 'Auswahl löschen' },
      ]
    },
    { 
      id: 'navigation', 
      title: 'Navigation', 
      shortcuts: [
        { keys: ['Scroll'], description: 'Zoom' },
        { keys: [cmdKey, '+'], description: 'Zoom In' },
        { keys: [cmdKey, '-'], description: 'Zoom Out' },
        { keys: [cmdKey, '0'], description: 'Zoom zurücksetzen' },
        { keys: ['Space (halten)'], description: 'Temporär Pan' },
        { keys: ['Rechtsklick + Ziehen'], description: 'Pan' },
      ]
    },
    { 
      id: 'general', 
      title: 'Allgemein', 
      shortcuts: [
        { keys: ['?', 'F1'], description: 'Shortcuts anzeigen' },
        { keys: ['Esc'], description: 'Auswahl aufheben' },
      ]
    },
  ]
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-hidden pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <KeyboardIcon />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Tastenkürzel</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <XIcon />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categories.map((category) => (
                    <div key={category.id}>
                      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
                        {category.title}
                      </h3>
                      <div className="space-y-2">
                        {category.shortcuts.map((shortcut, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between py-1.5"
                          >
                            <span className="text-gray-300 text-sm">
                              {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIdx) => (
                                <span key={keyIdx}>
                                  {keyIdx > 0 && (
                                    <span className="text-gray-500 mx-0.5">+</span>
                                  )}
                                  <kbd className="px-2 py-1 text-xs font-mono bg-gray-800 border border-gray-600 rounded text-gray-200">
                                    {key}
                                  </kbd>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Tip */}
                <div className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-300">
                    <strong>Tipp:</strong> Halte die <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-800 border border-gray-600 rounded mx-1">Shift</kbd> Taste gedrückt, um Objekte zur Auswahl hinzuzufügen.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
