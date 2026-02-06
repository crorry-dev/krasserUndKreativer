import { useCallback } from 'react'

export interface MediaData {
  src: string           // Base64 or Object URL
  mimeType: string      // e.g. 'image/png'
  originalName: string
  fileSize: number
  aspectRatio: number
  sourceType?: 'upload' | 'external'
  externalUrl?: string
  embedUrl?: string
  provider?: 'youtube' | 'direct'
  youtubeId?: string
  // Video/Audio specific
  duration?: number
  isPlaying?: boolean
  currentTime?: number
  volume?: number
}

// Supported file types
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
export const SUPPORTED_MEDIA_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES, ...SUPPORTED_AUDIO_TYPES]

// File size limits (in bytes)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024  // 50MB
export const MAX_AUDIO_SIZE = 10 * 1024 * 1024  // 10MB

interface UseMediaUploadOptions {
  onUpload: (mediaData: MediaData, type: 'image' | 'video' | 'audio') => void
  onError?: (error: string) => void
}

export function useMediaUpload({ onUpload, onError }: UseMediaUploadOptions) {
  
  const getMediaType = (mimeType: string): 'image' | 'video' | 'audio' | null => {
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) return 'image'
    if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) return 'video'
    if (SUPPORTED_AUDIO_TYPES.includes(mimeType)) return 'audio'
    return null
  }
  
  const getMaxSize = (type: 'image' | 'video' | 'audio'): number => {
    switch (type) {
      case 'image': return MAX_IMAGE_SIZE
      case 'video': return MAX_VIDEO_SIZE
      case 'audio': return MAX_AUDIO_SIZE
    }
  }
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  
  const processFile = useCallback(async (file: File): Promise<void> => {
    const mediaType = getMediaType(file.type)
    
    if (!mediaType) {
      onError?.(`Nicht unterstützter Dateityp: ${file.type}`)
      return
    }
    
    const maxSize = getMaxSize(mediaType)
    if (file.size > maxSize) {
      onError?.(`Datei zu groß (max. ${formatFileSize(maxSize)})`)
      return
    }
    
    try {
      // Read file as base64
      const base64 = await readFileAsBase64(file)
      
      // Get dimensions/duration based on type
      let aspectRatio = 1
      let duration: number | undefined
      
      if (mediaType === 'image') {
        const dimensions = await getImageDimensions(base64)
        aspectRatio = dimensions.width / dimensions.height
      } else if (mediaType === 'video') {
        const videoInfo = await getVideoInfo(base64)
        aspectRatio = videoInfo.width / videoInfo.height
        duration = videoInfo.duration
      } else if (mediaType === 'audio') {
        duration = await getAudioDuration(base64)
      }
      
      const mediaData: MediaData = {
        src: base64,
        mimeType: file.type,
        originalName: file.name,
        fileSize: file.size,
        aspectRatio,
        sourceType: 'upload',
        duration,
      }
      
      onUpload(mediaData, mediaType)
    } catch (err) {
      onError?.(`Fehler beim Verarbeiten: ${err}`)
    }
  }, [onUpload, onError])
  
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return
    
    Array.from(files).forEach(file => {
      processFile(file)
    })
  }, [processFile])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [handleFileSelect])
  
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          processFile(file)
        }
      }
    }
  }, [processFile])
  
  return {
    handleFileSelect,
    handleDrop,
    handlePaste,
    processFile,
    SUPPORTED_MEDIA_TYPES,
  }
}

// Helper functions
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = src
  })
}

function getVideoInfo(src: string): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      })
    }
    video.onerror = reject
    video.src = src
  })
}

function getAudioDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => resolve(audio.duration)
    audio.onerror = reject
    audio.src = src
  })
}
