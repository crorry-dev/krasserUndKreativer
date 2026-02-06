import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMediaUpload, MediaData, SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES, SUPPORTED_AUDIO_TYPES } from '@/hooks/useMediaUpload'
import { useAudioRecorder, formatTime } from '@/hooks/useAudioRecorder'

// Icons as inline SVGs
const ImageIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const VideoIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const MicIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
)

const FileIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const StopIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
)

const SUPPORTED_EXTERNAL_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.m4v', '.ogv']

const getYouTubeId = (url: URL): string | null => {
  const host = url.hostname.replace('www.', '')
  if (host === 'youtu.be') return url.pathname.slice(1) || null
  if (host !== 'youtube.com' && host !== 'm.youtube.com') return null
  const id = url.searchParams.get('v')
  if (id) return id
  const pathMatch = url.pathname.match(/\/(embed|shorts)\/(.+)$/)
  return pathMatch?.[2] || null
}

const buildExternalVideoData = (rawUrl: string): { data?: MediaData; error?: string } => {
  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return { error: 'Ungültige URL' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { error: 'Nur http(s) Links sind erlaubt' }
  }

  const youtubeId = getYouTubeId(parsed)
  if (youtubeId) {
    const embedUrl = `https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&rel=0`
    return {
      data: {
        src: embedUrl,
        mimeType: 'video/youtube',
        originalName: 'YouTube Video',
        fileSize: 0,
        aspectRatio: 16 / 9,
        sourceType: 'external',
        externalUrl: parsed.toString(),
        embedUrl,
        provider: 'youtube',
        youtubeId,
      },
    }
  }

  const isDirectVideo = SUPPORTED_EXTERNAL_VIDEO_EXTENSIONS.some((ext) =>
    parsed.pathname.toLowerCase().endsWith(ext)
  )
  if (isDirectVideo) {
    const filename = parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname
    return {
      data: {
        src: parsed.toString(),
        mimeType: 'video/external',
        originalName: filename,
        fileSize: 0,
        aspectRatio: 16 / 9,
        sourceType: 'external',
        externalUrl: parsed.toString(),
        provider: 'direct',
      },
    }
  }

  return { error: 'Nur YouTube-Links oder direkte Video-URLs (mp4, webm, m4v, ogv) sind erlaubt.' }
}

interface MediaUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onMediaAdd: (mediaData: MediaData, type: 'image' | 'video' | 'audio', position?: { x: number; y: number }) => void
}

export function MediaUploadModal({ isOpen, onClose, onMediaAdd }: MediaUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'link'>('upload')
  const [linkUrl, setLinkUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { isRecording, recordingTime, audioBlob, audioUrl, startRecording, stopRecording, resetRecording, error: recordError } = useAudioRecorder()
  
  const { handleFileSelect, handleDrop: onDrop } = useMediaUpload({
    onUpload: (mediaData, type) => {
      onMediaAdd(mediaData, type)
      onClose()
    },
    onError: setError,
  })
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    onDrop(e)
  }
  
  const handleFileClick = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
  }
  
  const handleRecordClick = async () => {
    if (isRecording) {
      await stopRecording()
      // Recording saved, user can preview and add
    } else {
      resetRecording()
      await startRecording()
    }
  }
  
  const handleAddRecording = useCallback(async () => {
    if (!audioBlob || !audioUrl) return
    
    // Convert blob to base64
    const reader = new FileReader()
    reader.onload = () => {
      const mediaData: MediaData = {
        src: reader.result as string,
        mimeType: audioBlob.type,
        originalName: `Sprachmemo-${new Date().toLocaleTimeString('de-DE')}.webm`,
        fileSize: audioBlob.size,
        aspectRatio: 1,
        sourceType: 'upload',
        duration: recordingTime,
      }
      onMediaAdd(mediaData, 'audio')
      resetRecording()
      onClose()
    }
    reader.readAsDataURL(audioBlob)
  }, [audioBlob, audioUrl, recordingTime, onMediaAdd, resetRecording, onClose])

  const handleAddLink = useCallback(() => {
    const result = buildExternalVideoData(linkUrl)
    if (result.error) {
      setError(result.error)
      return
    }
    if (!result.data) return
    onMediaAdd(result.data, 'video')
    setLinkUrl('')
    setError(null)
    onClose()
  }, [linkUrl, onMediaAdd, onClose])
  
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
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">Medien hinzufügen</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b border-gray-700">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'upload' 
                      ? 'text-blue-400 border-b-2 border-blue-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Hochladen
                </button>
                <button
                  onClick={() => setActiveTab('record')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'record' 
                      ? 'text-blue-400 border-b-2 border-blue-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Aufnehmen
                </button>
                <button
                  onClick={() => setActiveTab('link')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'link'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Link
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4">
                {activeTab === 'upload' ? (
                  <>
                    {/* Drop Zone */}
                    <div
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className={`
                        border-2 border-dashed rounded-xl p-6 text-center transition-colors mb-4
                        ${isDragging 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-gray-600 hover:border-gray-500'
                        }
                      `}
                    >
                      <p className="text-gray-400 text-sm">
                        {isDragging ? 'Datei hier ablegen...' : 'Datei hierher ziehen oder unten auswählen'}
                      </p>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleFileClick(SUPPORTED_IMAGE_TYPES.join(','))}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        <div className="text-blue-400"><ImageIcon /></div>
                        <span className="text-sm text-gray-300">Bild</span>
                      </button>
                      
                      <button
                        onClick={() => handleFileClick(SUPPORTED_VIDEO_TYPES.join(','))}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        <div className="text-purple-400"><VideoIcon /></div>
                        <span className="text-sm text-gray-300">Video</span>
                      </button>
                      
                      <button
                        onClick={() => handleFileClick(SUPPORTED_AUDIO_TYPES.join(','))}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        <div className="text-green-400"><MicIcon /></div>
                        <span className="text-sm text-gray-300">Audio</span>
                      </button>
                      
                      <button
                        onClick={() => handleFileClick('*/*')}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        <div className="text-gray-400"><FileIcon /></div>
                        <span className="text-sm text-gray-300">Alle</span>
                      </button>
                    </div>
                  </>
                ) : activeTab === 'record' ? (
                  /* Record Tab */
                  <div className="text-center py-6">
                    {!audioBlob ? (
                      <>
                        {/* Recording UI */}
                        <button
                          onClick={handleRecordClick}
                          className={`
                            w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all
                            ${isRecording 
                              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                              : 'bg-gray-700 hover:bg-gray-600'
                            }
                          `}
                        >
                          {isRecording ? (
                            <StopIcon />
                          ) : (
                            <div className="text-red-400"><MicIcon /></div>
                          )}
                        </button>
                        
                        {isRecording && (
                          <p className="text-2xl font-mono text-red-400 mb-2">
                            {formatTime(recordingTime)}
                          </p>
                        )}
                        
                        <p className="text-gray-400 text-sm">
                          {isRecording 
                            ? 'Klicke zum Stoppen...' 
                            : 'Klicke zum Aufnehmen'
                          }
                        </p>
                        
                        {(error || recordError) && (
                          <p className="text-red-400 text-sm mt-4">{error || recordError}</p>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Playback UI */}
                        <div className="bg-gray-800 rounded-xl p-4 mb-4">
                          <audio src={audioUrl || undefined} controls className="w-full" />
                          <p className="text-sm text-gray-400 mt-2">
                            Dauer: {formatTime(recordingTime)}
                          </p>
                        </div>
                        
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={resetRecording}
                            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                          >
                            Neu aufnehmen
                          </button>
                          <button
                            onClick={handleAddRecording}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                          >
                            Hinzufügen
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Video-Link</label>
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => {
                          setLinkUrl(e.target.value)
                          setError(null)
                        }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Unterstützt: YouTube oder direkte Video-URLs (mp4, webm, m4v, ogv).
                      </p>
                    </div>

                    <button
                      onClick={handleAddLink}
                      disabled={linkUrl.trim().length === 0}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
                        linkUrl.trim().length === 0
                          ? 'bg-blue-600/40 text-white/60 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      <div className="text-white"><VideoIcon /></div>
                      <span className="text-sm font-medium">Video-Link hinzufügen</span>
                    </button>
                  </div>
                )}
                
                {error && activeTab !== 'record' && (
                  <p className="text-red-400 text-sm text-center mt-4">{error}</p>
                )}
              </div>
              
              {/* Footer hint */}
              <div className="px-4 pb-4">
                <p className="text-xs text-gray-500 text-center">
                  Bilder bis 10MB • Videos bis 50MB • Audio bis 10MB
                </p>
              </div>
            </div>
          </motion.div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            multiple
          />
        </>
      )}
    </AnimatePresence>
  )
}
