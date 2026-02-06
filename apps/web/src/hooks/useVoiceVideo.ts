import { useEffect, useRef, useCallback, useState } from 'react'

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

const DEFAULT_CHANNEL = { id: 'voice-general', name: 'Allgemein' }

export interface VoiceChannel {
  id: string
  name: string
}

export interface AudioSettings {
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

export interface CallParticipant {
  id: string
  name: string
  color: string
  stream?: MediaStream
  isMuted: boolean
  isVideoOff: boolean
  volume: number
  mutedByMe: boolean
  isSpeaking: boolean
  channelId: string
  isVip: boolean
}

interface IncomingCall {
  from: string
  name: string
  channelId: string
  withVideo: boolean
}

interface UseVoiceVideoOptions {
  boardId: string
  userId: string
  userName: string
  userColor: string
  wsRef: React.RefObject<WebSocket | null>
}

export function useVoiceVideo({ boardId, userId, userName, userColor, wsRef }: UseVoiceVideoOptions) {
  const [isInCall, setIsInCall] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [participants, setParticipants] = useState<Map<string, CallParticipant>>(new Map())
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [channels, setChannels] = useState<VoiceChannel[]>([DEFAULT_CHANNEL])
  const [currentChannelId, setCurrentChannelId] = useState<string>(DEFAULT_CHANNEL.id)
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
  const [lastSpeakerId, setLastSpeakerId] = useState<string | null>(null)
  const [vipSpeakerId, setVipSpeakerId] = useState<string | null>(null)
  const [muteOthers, setMuteOthers] = useState(false)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedMicId, setSelectedMicId] = useState('default')
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  })

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const analyserRefs = useRef<Map<string, AnalyserNode>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)

  const getChannelId = useCallback(() => currentChannelId || DEFAULT_CHANNEL.id, [currentChannelId])

  const updateAudioDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    setAudioDevices(devices.filter((d) => d.kind === 'audioinput'))
  }, [])

  const buildAudioConstraints = useCallback(() => {
    const deviceId = selectedMicId !== 'default' ? { deviceId: { exact: selectedMicId } } : {}
    return {
      echoCancellation: audioSettings.echoCancellation,
      noiseSuppression: audioSettings.noiseSuppression,
      autoGainControl: audioSettings.autoGainControl,
      ...deviceId,
    }
  }, [selectedMicId, audioSettings])

  const getLocalStream = useCallback(async (audio: boolean, video: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audio ? buildAudioConstraints() : false,
      video: video
        ? {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24 },
          }
        : false,
    })
    localStreamRef.current = stream
    return stream
  }, [buildAudioConstraints])

  const replaceAudioTrack = useCallback((track: MediaStreamTrack) => {
    peerConnectionsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'audio')
      if (sender) {
        sender.replaceTrack(track)
      }
    })
  }, [])

  const updateParticipant = useCallback((userIdToUpdate: string, changes: Partial<CallParticipant>) => {
    setParticipants((prev) => {
      const next = new Map(prev)
      const participant = next.get(userIdToUpdate)
      if (!participant) return prev
      next.set(userIdToUpdate, { ...participant, ...changes })
      return next
    })
  }, [])

  const upsertParticipant = useCallback((participant: CallParticipant) => {
    setParticipants((prev) => {
      const next = new Map(prev)
      next.set(participant.id, participant)
      return next
    })
  }, [])

  const createPeerConnection = useCallback((remoteUserId: string) => {
    const pc = new RTCPeerConnection(rtcConfig)

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0]
      updateParticipant(remoteUserId, { stream: remoteStream })
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_ice',
          targetUserId: remoteUserId,
          candidate: event.candidate,
        }))
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleUserLeft(remoteUserId)
      }
    }

    peerConnectionsRef.current.set(remoteUserId, pc)
    return pc
  }, [updateParticipant, wsRef])

  const handleUserLeft = useCallback((remoteUserId: string) => {
    const pc = peerConnectionsRef.current.get(remoteUserId)
    if (pc) {
      pc.close()
      peerConnectionsRef.current.delete(remoteUserId)
    }

    setParticipants((prev) => {
      const next = new Map(prev)
      const participant = next.get(remoteUserId)
      if (participant?.stream) {
        participant.stream.getTracks().forEach((t) => t.stop())
      }
      next.delete(remoteUserId)
      return next
    })
  }, [])

  const ensureSelfParticipant = useCallback((withVideo: boolean, channelId: string) => {
    upsertParticipant({
      id: userId,
      name: userName,
      color: userColor,
      stream: localStreamRef.current || undefined,
      isMuted: !isAudioEnabled,
      isVideoOff: !withVideo,
      volume: 1,
      mutedByMe: false,
      isSpeaking: false,
      channelId,
      isVip: vipSpeakerId === userId,
    })
  }, [isAudioEnabled, upsertParticipant, userId, userName, userColor, vipSpeakerId])

  const startCall = useCallback(async (withVideo: boolean) => {
    try {
      await getLocalStream(true, withVideo)
      setIsInCall(true)
      setIsVideoEnabled(withVideo)

      const channelId = getChannelId()
      ensureSelfParticipant(withVideo, channelId)

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'call_start',
          userName,
          userColor,
          withVideo,
          channelId,
        }))
      }
    } catch (error) {
      console.error('Error starting call:', error)
      alert('Fehler beim Starten des Anrufs. Bitte Mikrofonzugriff erlauben.')
    }
  }, [ensureSelfParticipant, getChannelId, getLocalStream, userColor, userName, wsRef])

  const joinCall = useCallback(async (initiatorId: string, withVideo: boolean) => {
    try {
      await getLocalStream(true, withVideo)
      setIsInCall(true)
      setIsVideoEnabled(withVideo)
      setIncomingCall(null)

      const channelId = incomingCall?.channelId || getChannelId()
      setCurrentChannelId(channelId)
      ensureSelfParticipant(withVideo, channelId)

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'call_join',
          userName,
          userColor,
          withVideo,
          channelId,
        }))
      }

      if (initiatorId) {
        createPeerConnection(initiatorId)
      }
    } catch (error) {
      console.error('Error joining call:', error)
      alert('Fehler beim Beitreten des Anrufs.')
    }
  }, [createPeerConnection, ensureSelfParticipant, getChannelId, getLocalStream, incomingCall?.channelId, userColor, userName, wsRef])

  const endCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'call_end',
        channelId: getChannelId(),
      }))
    }

    setIsInCall(false)
    setParticipants(new Map())
  }, [getChannelId, wsRef])

  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return
    const audioTracks = localStreamRef.current.getAudioTracks()
    audioTracks.forEach((track) => {
      track.enabled = !track.enabled
    })

    setIsAudioEnabled((prev) => !prev)
    updateParticipant(userId, { isMuted: isAudioEnabled })

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'call_mute',
        isMuted: isAudioEnabled,
        channelId: getChannelId(),
      }))
    }
  }, [getChannelId, isAudioEnabled, updateParticipant, userId, wsRef])

  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) return
    const videoTracks = localStreamRef.current.getVideoTracks()

    if (videoTracks.length > 0) {
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoEnabled((prev) => !prev)
    } else if (!isVideoEnabled) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        })
        const videoTrack = videoStream.getVideoTracks()[0]
        localStreamRef.current.addTrack(videoTrack)
        peerConnectionsRef.current.forEach((pc) => {
          pc.addTrack(videoTrack, localStreamRef.current!)
        })
        setIsVideoEnabled(true)
      } catch (error) {
        console.error('Error adding video:', error)
      }
    }

    updateParticipant(userId, { isVideoOff: isVideoEnabled })

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'call_video',
        isVideoOff: isVideoEnabled,
        channelId: getChannelId(),
      }))
    }
  }, [getChannelId, isVideoEnabled, updateParticipant, userId, wsRef])

  const declineCall = useCallback(() => {
    if (incomingCall && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'call_decline',
        targetUserId: incomingCall.from,
      }))
    }
    setIncomingCall(null)
  }, [incomingCall, wsRef])

  const createChannel = useCallback((name: string) => {
    const channelId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const channel = { id: channelId, name }
    setChannels((prev) => [...prev, channel])
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'voice_channel_create',
        channel,
      }))
    }
  }, [wsRef])

  const joinChannel = useCallback((channelId: string) => {
    setCurrentChannelId(channelId)
    updateParticipant(userId, { channelId })
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'voice_channel_join',
        channelId,
      }))
    }
  }, [updateParticipant, userId, wsRef])

  const moveParticipant = useCallback((targetUserId: string, channelId: string) => {
    updateParticipant(targetUserId, { channelId })
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'voice_channel_move',
        targetUserId,
        channelId,
      }))
    }
  }, [updateParticipant, wsRef])

  const setParticipantVolume = useCallback((targetUserId: string, volume: number) => {
    updateParticipant(targetUserId, { volume })
  }, [updateParticipant])

  const toggleParticipantMute = useCallback((targetUserId: string) => {
    setParticipants((prev) => {
      const next = new Map(prev)
      const participant = next.get(targetUserId)
      if (!participant) return prev
      next.set(targetUserId, { ...participant, mutedByMe: !participant.mutedByMe })
      return next
    })
  }, [])

  const toggleMuteOthers = useCallback(() => {
    setMuteOthers((prev) => !prev)
    setParticipants((prev) => {
      const next = new Map(prev)
      next.forEach((p, id) => {
        if (id === userId) return
        const isVip = vipSpeakerId && id === vipSpeakerId
        next.set(id, { ...p, mutedByMe: !muteOthers && !isVip })
      })
      return next
    })
  }, [muteOthers, userId, vipSpeakerId])

  const setVipSpeaker = useCallback((nextVipId: string | null) => {
    setVipSpeakerId(nextVipId)
    setParticipants((prev) => {
      const next = new Map(prev)
      next.forEach((p, id) => {
        const isVip = nextVipId === id
        const mutedByMe = muteOthers ? !isVip && id !== userId : p.mutedByMe
        next.set(id, { ...p, isVip, mutedByMe })
      })
      return next
    })
  }, [muteOthers, userId])

  const setAudioDevice = useCallback(async (deviceId: string) => {
    setSelectedMicId(deviceId)
    if (!localStreamRef.current) return
    const stream = await getLocalStream(true, isVideoEnabled)
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      replaceAudioTrack(audioTrack)
    }
  }, [getLocalStream, isVideoEnabled, replaceAudioTrack])

  const updateAudioSettings = useCallback(async (nextSettings: AudioSettings) => {
    setAudioSettings(nextSettings)
    if (!localStreamRef.current) return
    const stream = await getLocalStream(true, isVideoEnabled)
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      replaceAudioTrack(audioTrack)
    }
  }, [getLocalStream, isVideoEnabled, replaceAudioTrack])

  const handleWebRTCMessage = useCallback(async (data: Record<string, unknown>) => {
    const msgType = data.type as string
    const channelId = (data.channelId as string | undefined) || getChannelId()

    switch (msgType) {
      case 'voice_channels_sync': {
        const incoming = data.channels as VoiceChannel[]
        if (incoming?.length) setChannels(incoming)
        break
      }

      case 'voice_channel_users': {
        const users = data.users as { userId: string; channelId: string }[]
        if (!users) break
        const selfChannel = users.find((u) => u.userId === userId)
        if (selfChannel?.channelId) {
          setCurrentChannelId(selfChannel.channelId)
        }
        setParticipants((prev) => {
          const next = new Map(prev)
          users.forEach((u) => {
            const participant = next.get(u.userId)
            if (participant) {
              next.set(u.userId, { ...participant, channelId: u.channelId })
            }
          })
          return next
        })
        break
      }

      case 'voice_channel_create': {
        const channel = data.channel as VoiceChannel
        if (!channel) break
        setChannels((prev) => (prev.some((c) => c.id === channel.id) ? prev : [...prev, channel]))
        break
      }

      case 'voice_channel_update': {
        const channel = data.channel as VoiceChannel
        if (!channel) break
        setChannels((prev) => prev.map((c) => (c.id === channel.id ? channel : c)))
        break
      }

      case 'voice_channel_delete': {
        const id = data.channelId as string
        if (!id) break
        setChannels((prev) => prev.filter((c) => c.id !== id))
        break
      }

      case 'voice_channel_join':
      case 'voice_channel_move': {
        const targetUserId = data.userId as string
        const targetChannelId = data.channelId as string
        if (!targetUserId || !targetChannelId) break
        updateParticipant(targetUserId, { channelId: targetChannelId })
        break
      }

      case 'voice_channel_leave': {
        const targetUserId = data.userId as string
        if (targetUserId) handleUserLeft(targetUserId)
        break
      }

      case 'call_start': {
        const callerId = data.userId as string
        const callerName = data.userName as string
        const withVideo = data.withVideo as boolean

        if (callerId !== userId && !isInCall) {
          setIncomingCall({
            from: callerId,
            name: callerName,
            channelId,
            withVideo,
          })
        }
        break
      }

      case 'call_join': {
        const joinerId = data.userId as string
        const joinerName = data.userName as string
        const joinerColor = data.userColor as string
        const withVideo = data.withVideo as boolean

        if (isInCall && joinerId !== userId && channelId === getChannelId()) {
          upsertParticipant({
            id: joinerId,
            name: joinerName,
            color: joinerColor,
            isMuted: false,
            isVideoOff: !withVideo,
            volume: 1,
            mutedByMe: false,
            isSpeaking: false,
            channelId,
            isVip: vipSpeakerId === joinerId,
          })

          const pc = createPeerConnection(joinerId)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'webrtc_offer',
              targetUserId: joinerId,
              offer,
              userName,
              userColor,
            }))
          }
        }
        break
      }

      case 'webrtc_offer': {
        const fromId = data.userId as string
        const offer = data.offer as RTCSessionDescriptionInit
        const fromName = data.userName as string
        const fromColor = data.userColor as string

        if (isInCall) {
          upsertParticipant({
            id: fromId,
            name: fromName,
            color: fromColor,
            isMuted: false,
            isVideoOff: true,
            volume: 1,
            mutedByMe: false,
            isSpeaking: false,
            channelId: getChannelId(),
            isVip: vipSpeakerId === fromId,
          })

          const pc = createPeerConnection(fromId)
          await pc.setRemoteDescription(new RTCSessionDescription(offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'webrtc_answer',
              targetUserId: fromId,
              answer,
            }))
          }
        }
        break
      }

      case 'webrtc_answer': {
        const fromId = data.userId as string
        const answer = data.answer as RTCSessionDescriptionInit
        const pc = peerConnectionsRef.current.get(fromId)
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        }
        break
      }

      case 'webrtc_ice': {
        const fromId = data.userId as string
        const candidate = data.candidate as RTCIceCandidateInit
        const pc = peerConnectionsRef.current.get(fromId)
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        }
        break
      }

      case 'call_end': {
        const leftUserId = data.userId as string
        handleUserLeft(leftUserId)
        break
      }

      case 'call_mute': {
        const mutedUserId = data.userId as string
        const isMuted = data.isMuted as boolean
        updateParticipant(mutedUserId, { isMuted })
        break
      }

      case 'call_video': {
        const videoUserId = data.userId as string
        const isVideoOff = data.isVideoOff as boolean
        updateParticipant(videoUserId, { isVideoOff })
        break
      }
    }
  }, [createPeerConnection, getChannelId, handleUserLeft, isInCall, updateParticipant, upsertParticipant, userColor, userId, userName, vipSpeakerId, wsRef])

  useEffect(() => {
    updateAudioDevices()
    navigator.mediaDevices.addEventListener('devicechange', updateAudioDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', updateAudioDevices)
    }
  }, [updateAudioDevices])

  useEffect(() => {
    setParticipants((prev) => {
      const next = new Map(prev)
      next.forEach((p, id) => {
        next.set(id, { ...p, isVip: vipSpeakerId === id })
      })
      return next
    })
  }, [vipSpeakerId])

  useEffect(() => {
    if (!isInCall) return
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    const ctx = audioContextRef.current
    const interval = window.setInterval(() => {
      let loudestId: string | null = null
      let loudestLevel = 0

      setParticipants((prev) => {
        const next = new Map(prev)

        next.forEach((participant, id) => {
          if (!participant.stream || id === userId) return
          const audioTrack = participant.stream.getAudioTracks()[0]
          if (!audioTrack) return

          let analyser = analyserRefs.current.get(id)
          if (!analyser) {
            const source = ctx.createMediaStreamSource(participant.stream)
            analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)
            analyserRefs.current.set(id, analyser)
          }

          const buffer = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(buffer)
          const level = buffer.reduce((sum, v) => sum + v, 0) / buffer.length
          const isSpeaking = level > 25

          if (isSpeaking && level > loudestLevel) {
            loudestLevel = level
            loudestId = id
          }

          next.set(id, { ...participant, isSpeaking })
        })

        return next
      })

      if (loudestId && loudestId !== activeSpeakerId) {
        setLastSpeakerId(activeSpeakerId)
        setActiveSpeakerId(loudestId)
      }
    }, 350)

    return () => window.clearInterval(interval)
  }, [activeSpeakerId, isInCall, userId])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      try {
        handleWebRTCMessage(JSON.parse(event.data))
      } catch (error) {
        console.error('Voice message parse error', error)
      }
    }

    if (wsRef.current) {
      wsRef.current.addEventListener('message', onMessage)
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.removeEventListener('message', onMessage)
      }
    }
  }, [handleWebRTCMessage, wsRef])

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      peerConnectionsRef.current.forEach((pc) => pc.close())
      audioContextRef.current?.close()
    }
  }, [])

  return {
    isInCall,
    isAudioEnabled,
    isVideoEnabled,
    participants,
    incomingCall,
    currentChannelId,
    channels,
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
  }
}
