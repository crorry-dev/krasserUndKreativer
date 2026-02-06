import { useCallback, useEffect, useMemo, useRef } from 'react'
import Konva from 'konva'
import { CanvasObject, ViewportState } from '@/stores/canvasStore'

interface MediaOverlayProps {
  obj: CanvasObject
  viewport: ViewportState
  stageRef: React.RefObject<Konva.Stage>
  isSelected: boolean
  onSelect: () => void
  updateObject: (id: string, changes: Partial<CanvasObject>, recordHistory?: boolean) => void
  onObjectUpdate?: (objectId: string, changes: Record<string, unknown>) => void
}

type MediaObjectData = {
  src: string
  mimeType: string
  originalName?: string
  isPlaying?: boolean
  currentTime?: number
  volume?: number
  sourceType?: 'upload' | 'external'
  externalUrl?: string
  embedUrl?: string
  provider?: 'youtube' | 'direct'
  youtubeId?: string
}

type YouTubePlayerInstance = {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (time: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getPlayerState: () => number
  setVolume: (volume: number) => void
  getVolume: () => number
  destroy: () => void
}

type YouTubeApi = {
  Player: new (element: HTMLElement, options: {
    videoId: string
    playerVars?: Record<string, number | string>
    events?: {
      onReady?: () => void
      onStateChange?: (event: { data: number }) => void
    }
  }) => YouTubePlayerInstance
  PlayerState: {
    PLAYING: number
    PAUSED: number
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null

const loadYouTubeApi = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API unavailable'))
  }

  const existingApi = (window as unknown as { YT?: YouTubeApi }).YT
  if (existingApi?.Player) return Promise.resolve(existingApi)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    if (!existingScript) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      tag.onerror = () => reject(new Error('YouTube API load failed'))
      document.head.appendChild(tag)
    }

    const previousReady = (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady
    ;(window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
      previousReady?.()
      const api = (window as unknown as { YT?: YouTubeApi }).YT
      if (api?.Player) {
        resolve(api)
      } else {
        reject(new Error('YouTube API unavailable'))
      }
    }
  })

  return youtubeApiPromise
}

const AudioIcon = () => (
  <svg className="w-6 h-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 19V5l12-2v16"
    />
    <circle cx="6" cy="18" r="3" strokeWidth={1.5} />
    <circle cx="18" cy="16" r="3" strokeWidth={1.5} />
  </svg>
)

const shouldSkipSync = (lastLocalActionAt: number) => {
  return Date.now() - lastLocalActionAt < 200
}

export function MediaOverlay({
  obj,
  viewport,
  stageRef,
  isSelected,
  onSelect,
  updateObject,
  onObjectUpdate,
}: MediaOverlayProps) {
  const data = obj.data as MediaObjectData
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null)
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null)
  const youtubePlayerRef = useRef<YouTubePlayerInstance | null>(null)
  const youtubeSyncTimerRef = useRef<number | null>(null)
  const isSyncingRef = useRef(false)
  const lastLocalActionRef = useRef(0)
  const lastTimeSyncRef = useRef(0)

  const screenMetrics = useMemo(() => {
    const stage = stageRef.current
    if (!stage) return null
    const stageBox = stage.container().getBoundingClientRect()
    const screenX = stageBox.left + obj.x * viewport.scale + viewport.x
    const screenY = stageBox.top + obj.y * viewport.scale + viewport.y
    const screenWidth = obj.width * viewport.scale
    const screenHeight = obj.height * viewport.scale

    const isOffscreen =
      screenX + screenWidth < 0 ||
      screenY + screenHeight < 0 ||
      screenX > window.innerWidth ||
      screenY > window.innerHeight

    if (isOffscreen || screenWidth < 20 || screenHeight < 20) return null

    return { screenX, screenY, screenWidth, screenHeight }
  }, [obj.x, obj.y, obj.width, obj.height, viewport.scale, viewport.x, viewport.y, stageRef])

  const isExternalVideo = obj.type === 'video' && data.sourceType === 'external'
  const youtubeId = useMemo(() => {
    if (data.youtubeId) return data.youtubeId
    if (!data.embedUrl) return undefined
    const match = data.embedUrl.match(/\/embed\/([^?]+)/)
    return match?.[1]
  }, [data.embedUrl, data.youtubeId])
  const isYouTube = isExternalVideo && data.provider === 'youtube' && Boolean(youtubeId)
  const videoSrc = data.embedUrl ?? data.src

  const pushMediaUpdate = useCallback(
    (partial: Partial<MediaObjectData>) => {
      const nextData = { ...data, ...partial }
      lastLocalActionRef.current = Date.now()
      updateObject(obj.id, { data: nextData }, false)
      onObjectUpdate?.(obj.id, { data: nextData })
    },
    [data, obj.id, updateObject, onObjectUpdate]
  )

  const handlePlay = useCallback(() => {
    if (isSyncingRef.current) return
    const media = mediaRef.current
    if (!media) return
    pushMediaUpdate({ isPlaying: true, currentTime: media.currentTime })
  }, [pushMediaUpdate])

  const handlePause = useCallback(() => {
    if (isSyncingRef.current) return
    const media = mediaRef.current
    if (!media) return
    pushMediaUpdate({ isPlaying: false, currentTime: media.currentTime })
  }, [pushMediaUpdate])

  const handleTimeUpdate = useCallback(() => {
    if (isSyncingRef.current) return
    const media = mediaRef.current
    if (!media) return
    const now = Date.now()
    if (now - lastTimeSyncRef.current < 600) return
    lastTimeSyncRef.current = now
    pushMediaUpdate({ currentTime: media.currentTime })
  }, [pushMediaUpdate])

  const handleVolumeChange = useCallback(() => {
    if (isSyncingRef.current) return
    const media = mediaRef.current
    if (!media) return
    pushMediaUpdate({ volume: media.volume })
  }, [pushMediaUpdate])

  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    if (shouldSkipSync(lastLocalActionRef.current)) return

    isSyncingRef.current = true

    if (typeof data.volume === 'number' && Math.abs(media.volume - data.volume) > 0.05) {
      media.volume = data.volume
    }

    if (typeof data.currentTime === 'number' && Number.isFinite(data.currentTime)) {
      const diff = Math.abs(media.currentTime - data.currentTime)
      if (diff > 0.4) {
        try {
          media.currentTime = data.currentTime
        } catch {
          // Ignore seek errors while metadata loads
        }
      }
    }

    if (data.isPlaying) {
      if (media.paused) {
        media.play().catch(() => undefined)
      }
    } else if (!media.paused) {
      media.pause()
    }

    window.setTimeout(() => {
      isSyncingRef.current = false
    }, 0)
  }, [data.currentTime, data.isPlaying, data.volume])

  useEffect(() => {
    if (!isYouTube || !youtubeId || !youtubeContainerRef.current) return

    let cancelled = false

    loadYouTubeApi()
      .then((api) => {
        if (cancelled || !youtubeContainerRef.current) return
        const player = new api.Player(youtubeContainerRef.current, {
          videoId: youtubeId,
          playerVars: {
            controls: 1,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onStateChange: (event) => {
              if (isSyncingRef.current) return
              const currentTime = player.getCurrentTime()
              if (event.data === api.PlayerState.PLAYING) {
                pushMediaUpdate({ isPlaying: true, currentTime })
              }
              if (event.data === api.PlayerState.PAUSED) {
                pushMediaUpdate({ isPlaying: false, currentTime })
              }
            },
          },
        })

        youtubePlayerRef.current = player

        if (youtubeSyncTimerRef.current) {
          window.clearInterval(youtubeSyncTimerRef.current)
        }

        youtubeSyncTimerRef.current = window.setInterval(() => {
          if (!youtubePlayerRef.current || isSyncingRef.current) return
          const currentTime = youtubePlayerRef.current.getCurrentTime()
          const volume = youtubePlayerRef.current.getVolume() / 100
          const now = Date.now()
          if (now - lastTimeSyncRef.current < 1200) return
          lastTimeSyncRef.current = now
          pushMediaUpdate({ currentTime, volume })
        }, 1500)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      youtubePlayerRef.current?.destroy()
      youtubePlayerRef.current = null
      if (youtubeSyncTimerRef.current) {
        window.clearInterval(youtubeSyncTimerRef.current)
        youtubeSyncTimerRef.current = null
      }
    }
  }, [isYouTube, youtubeId, pushMediaUpdate])

  useEffect(() => {
    if (!isYouTube || !youtubePlayerRef.current) return
    if (shouldSkipSync(lastLocalActionRef.current)) return

    isSyncingRef.current = true

    if (typeof data.volume === 'number') {
      const targetVolume = Math.max(0, Math.min(1, data.volume))
      youtubePlayerRef.current.setVolume(Math.round(targetVolume * 100))
    }

    if (typeof data.currentTime === 'number' && Number.isFinite(data.currentTime)) {
      youtubePlayerRef.current.seekTo(data.currentTime, true)
    }

    if (data.isPlaying) {
      youtubePlayerRef.current.playVideo()
    } else {
      youtubePlayerRef.current.pauseVideo()
    }

    window.setTimeout(() => {
      isSyncingRef.current = false
    }, 0)
  }, [data.currentTime, data.isPlaying, data.volume, isYouTube])

  if (!screenMetrics) return null

  return (
    <div
      className={`fixed overflow-hidden rounded-lg ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        left: screenMetrics.screenX,
        top: screenMetrics.screenY,
        width: screenMetrics.screenWidth,
        height: screenMetrics.screenHeight,
        pointerEvents: 'auto',
        zIndex: 30,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {obj.type === 'video' ? (
        isYouTube ? (
          <div
            ref={youtubeContainerRef}
            className="w-full h-full bg-black"
            aria-label={data.originalName || 'YouTube Video'}
          />
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={videoSrc}
            controls
            playsInline
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleTimeUpdate}
            onVolumeChange={handleVolumeChange}
            className="w-full h-full object-cover bg-black"
            style={{ borderRadius: 8 }}
          />
        )
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center p-2 gap-2">
          <AudioIcon />
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={data.src}
            controls
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleTimeUpdate}
            onVolumeChange={handleVolumeChange}
            className="w-full max-w-full"
            style={{ maxHeight: '40px' }}
          />
          <div className="text-[10px] text-gray-400 truncate max-w-full px-1">
            {data.originalName}
          </div>
        </div>
      )}
    </div>
  )
}
