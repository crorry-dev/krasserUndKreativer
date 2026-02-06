import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExportOptions } from '@/hooks/useExport'
import { useCanvasStore } from '@/stores/canvasStore'

// Icons
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const CopyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (options: ExportOptions) => Promise<void>
  onCopy: (options: ExportOptions) => Promise<void>
}

export function ExportModal({ isOpen, onClose, onExport, onCopy }: ExportModalProps) {
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const selectedCount = selectedIds.size
  
  const [format, setFormat] = useState<'png' | 'svg' | 'json'>('png')
  const [scale, setScale] = useState(2)
  const [background, setBackground] = useState<'#1a1a2e' | '#ffffff' | 'transparent'>('#1a1a2e')
  const [includeSelection, setIncludeSelection] = useState(false)
  const [padding, setPadding] = useState(20)
  const [isExporting, setIsExporting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const getOptions = useCallback((): ExportOptions => ({
    format,
    quality: 1,
    scale,
    background,
    includeSelection,
    padding,
  }), [format, scale, background, includeSelection, padding])
  
  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      await onExport(getOptions())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setIsExporting(false)
    }
  }
  
  const handleCopy = async () => {
    setError(null)
    try {
      await onCopy(getOptions())
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kopieren fehlgeschlagen')
    }
  }
  
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">📤 Canvas exportieren</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                >
                  <CloseIcon />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['png', 'svg', 'json'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                          format === f
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {format === 'png' && 'Rastergrafik - ideal für Sharing'}
                    {format === 'svg' && 'Vektorgrafik - skalierbar ohne Qualitätsverlust'}
                    {format === 'json' && 'Daten-Export - für Backup oder Import'}
                  </p>
                </div>
                
                {/* Scale (only for PNG) */}
                {format === 'png' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Auflösung: {scale}x
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.5"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1x (Standard)</span>
                      <span>4x (Hochauflösend)</span>
                    </div>
                  </div>
                )}
                
                {/* Background */}
                {format !== 'json' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Hintergrund</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBackground('#1a1a2e')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                          background === '#1a1a2e'
                            ? 'ring-2 ring-blue-500 bg-[#1a1a2e]'
                            : 'bg-[#1a1a2e] hover:ring-1 ring-gray-600'
                        }`}
                      >
                        <div className="w-4 h-4 rounded bg-[#1a1a2e] border border-gray-600" />
                        <span className="text-gray-300">Dunkel</span>
                      </button>
                      <button
                        onClick={() => setBackground('#ffffff')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                          background === '#ffffff'
                            ? 'ring-2 ring-blue-500 bg-gray-800'
                            : 'bg-gray-800 hover:ring-1 ring-gray-600'
                        }`}
                      >
                        <div className="w-4 h-4 rounded bg-white border border-gray-400" />
                        <span className="text-gray-300">Hell</span>
                      </button>
                      <button
                        onClick={() => setBackground('transparent')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                          background === 'transparent'
                            ? 'ring-2 ring-blue-500 bg-gray-800'
                            : 'bg-gray-800 hover:ring-1 ring-gray-600'
                        }`}
                      >
                        <div className="w-4 h-4 rounded bg-gradient-to-br from-gray-400 via-white to-gray-400 border border-gray-600" style={{ backgroundSize: '8px 8px', backgroundImage: 'linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)' }} />
                        <span className="text-gray-300">Transparent</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Padding */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Abstand: {padding}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={padding}
                    onChange={(e) => setPadding(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                {/* Selection Option */}
                {selectedCount > 0 && (
                  <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
                    <input
                      type="checkbox"
                      checked={includeSelection}
                      onChange={(e) => setIncludeSelection(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                    />
                    <span className="text-sm text-gray-300">
                      Nur Auswahl exportieren ({selectedCount} Objekt{selectedCount !== 1 ? 'e' : ''})
                    </span>
                  </label>
                )}
                
                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-400">
                    {error}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-gray-700 bg-gray-800/50">
                <button
                  onClick={handleCopy}
                  disabled={format === 'json'}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    format === 'json'
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {isCopied ? <CheckIcon /> : <CopyIcon />}
                  {isCopied ? 'Kopiert!' : 'Kopieren'}
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <DownloadIcon />
                  {isExporting ? 'Exportiere...' : 'Download'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
