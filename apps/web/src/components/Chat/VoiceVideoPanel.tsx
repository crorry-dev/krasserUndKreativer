import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  X,
  Maximize2,
  Minimize2,
  Settings,
  Volume2,
  VolumeX,
  Crown,
  UserPlus,
  UserMinus,
} from 'lucide-react'
import { CallParticipant, VoiceChannel, AudioSettings } from '../../hooks/useVoiceVideo'

interface VoiceVideoPanelProps {
  isInCall: boolean
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  participants: Map<string, CallParticipant>
  currentUserId: string
  incomingCall: { from: string; name: string; channelId: string; withVideo: boolean } | null
  currentChannelId: string
  channels: VoiceChannel[]
  activeSpeakerId: string | null
  lastSpeakerId: string | null
  audioDevices: MediaDeviceInfo[]
  selectedMicId: string
  audioSettings: AudioSettings
  vipSpeakerId: string | null
  muteOthers: boolean
  onStartCall: (withVideo: boolean) => void
  onJoinCall: (initiatorId: string, withVideo: boolean) => void
  onEndCall: () => void
  onToggleAudio: () => void
  onToggleVideo: () => void
  onDeclineCall: () => void
  onCreateChannel: (name: string) => void
  onJoinChannel: (channelId: string) => void
  onMoveParticipant: (userId: string, channelId: string) => void
  onSetVipSpeaker: (userId: string | null) => void
  onToggleMuteOthers: () => void
  onSetParticipantVolume: (userId: string, volume: number) => void
  onToggleParticipantMute: (userId: string) => void
  onSelectMic: (deviceId: string) => void
  onUpdateAudioSettings: (settings: AudioSettings) => void
}

/**
 * Video-Element für einen Teilnehmer
 */
function ParticipantVideo({ 
  participant, 
  isLocal,
  isMini,
  isActive,
}: { 
  participant: CallParticipant
  isLocal: boolean
  isMini: boolean
  isActive: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream
    }
    if (audioRef.current && participant.stream) {
      audioRef.current.srcObject = participant.stream
    }
  }, [participant.stream])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isLocal || participant.mutedByMe
      videoRef.current.volume = participant.volume
    }
    if (audioRef.current) {
      audioRef.current.muted = isLocal || participant.mutedByMe || !participant.isVideoOff
      audioRef.current.volume = participant.volume
    }
  }, [isLocal, participant.isVideoOff, participant.mutedByMe, participant.volume])
  
  const size = isMini ? 'w-24 h-18' : 'w-full h-full'
  
  return (
    <div className={`relative ${size} bg-gray-800 rounded-lg overflow-hidden ${isActive ? 'ring-2 ring-emerald-400' : ''}`}>
      {participant.stream && !participant.isVideoOff && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      )}

      {participant.stream && (
        <audio ref={audioRef} autoPlay playsInline />
      )}

      {(!participant.stream || participant.isVideoOff) && (
        <div className="w-full h-full flex items-center justify-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: participant.color }}
          >
            {participant.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded">
          {participant.name} {isLocal && '(Du)'}
        </span>
        <div className="flex gap-1">
          {participant.isMuted && (
            <span className="w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center">
              <MicOff className="w-3 h-3" />
            </span>
          )}
          {participant.isVideoOff && (
            <span className="w-5 h-5 bg-gray-600/80 rounded-full flex items-center justify-center">
              <VideoOff className="w-3 h-3" />
            </span>
          )}
          {participant.isVip && (
            <span className="w-5 h-5 bg-amber-500/80 rounded-full flex items-center justify-center">
              <Crown className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
          <div className="text-xs text-gray-400">Teilnehmer steuern</div>
          {participantArray.map((participant) => (
            <div key={participant.id} className="flex items-center gap-2 bg-gray-800/70 rounded-lg px-2 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white truncate">{participant.name}</span>
                  {participant.id === vipSpeakerId && (
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <div className="text-[10px] text-gray-400">{participant.channelId}</div>
              </div>
              <button
                onClick={() => onToggleParticipantMute(participant.id)}
                className="w-8 h-8 rounded-full bg-gray-700/70 hover:bg-gray-600 flex items-center justify-center"
                title="Stummschalten"
              >
                {participant.mutedByMe ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={participant.volume}
                onChange={(e) => onSetParticipantVolume(participant.id, parseFloat(e.target.value))}
                className="w-24"
              />
              <select
                value={participant.channelId}
                onChange={(e) => onMoveParticipant(participant.id, e.target.value)}
                className="bg-gray-800/70 border border-gray-700 rounded-lg px-1 py-1 text-xs text-white"
              >
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>{channel.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {showChannels && (
        <div className="border-b border-gray-700 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Voice Channels</span>
            <button
              onClick={() => setShowChannels(false)}
              className="text-gray-500 hover:text-white"
            >
              <UserMinus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onJoinChannel(channel.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  channel.id === currentChannelId
                    ? 'bg-blue-500/20 text-blue-200'
                    : 'bg-gray-800/70 text-gray-200 hover:bg-gray-700'
                }`}
              >
                <span className="truncate">{channel.name}</span>
                {channel.id === currentChannelId && (
                  <span className="text-[10px] text-blue-300">Aktiv</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Neuer Channel"
              className="flex-1 bg-gray-800/70 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder:text-gray-500"
            />
            <button
              onClick={() => {
                if (!newChannelName.trim()) return
                onCreateChannel(newChannelName.trim())
                setNewChannelName('')
              }}
              className="p-2 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-gray-200"
              title="Channel erstellen"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="border-b border-gray-700 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Gruppeneinstellungen</span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEndCall}
              className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 text-xs hover:bg-red-500/30"
            >
              Verlassen
            </button>
            <button
              onClick={onToggleMuteOthers}
              className={`flex-1 px-3 py-2 rounded-lg text-xs ${
                muteOthers ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-800/70 text-gray-200'
              }`}
            >
              Andere stummschalten
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">VIP Sprecher</label>
            <select
              value={vipSpeakerId || ''}
              onChange={(e) => onSetVipSpeaker(e.target.value || null)}
              className="flex-1 bg-gray-800/70 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white"
            >
              <option value="">Keiner</option>
              {participantArray.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <span className="text-xs text-gray-400">Mikrofon</span>
            <select
              value={selectedMicId}
              onChange={(e) => onSelectMic(e.target.value)}
              className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white"
            >
              <option value="default">Standardgerät</option>
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Mikrofon'}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={audioSettings.echoCancellation}
                  onChange={(e) => onUpdateAudioSettings({ ...audioSettings, echoCancellation: e.target.checked })}
                />
                Echo
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={audioSettings.noiseSuppression}
                  onChange={(e) => onUpdateAudioSettings({ ...audioSettings, noiseSuppression: e.target.checked })}
                />
                Noise
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={audioSettings.autoGainControl}
                  onChange={(e) => onUpdateAudioSettings({ ...audioSettings, autoGainControl: e.target.checked })}
                />
                Gain
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Voice/Video Call Panel
 */
export function VoiceVideoPanel({
  isInCall,
  isAudioEnabled,
  isVideoEnabled,
  participants,
  currentUserId,
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
  onStartCall,
  onJoinCall,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  onDeclineCall,
  onCreateChannel,
  onJoinChannel,
  onMoveParticipant,
  onSetVipSpeaker,
  onToggleMuteOthers,
  onSetParticipantVolume,
  onToggleParticipantMute,
  onSelectMic,
  onUpdateAudioSettings,
}: VoiceVideoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showStartMenu, setShowStartMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showChannels, setShowChannels] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  
  const participantArray = Array.from(participants.values())
  const otherParticipants = participantArray.filter(p => p.id !== currentUserId)
  const selfParticipant = participantArray.find(p => p.id === currentUserId)
  const activeSpeaker = activeSpeakerId ? participants.get(activeSpeakerId) : null
  const lastSpeaker = lastSpeakerId ? participants.get(lastSpeakerId) : null
  const currentChannel = channels.find((c) => c.id === currentChannelId)
  
  // Incoming Call Modal
  if (incomingCall) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-24 right-4 z-50 bg-gray-800/95 backdrop-blur-md rounded-xl border border-gray-700 p-4 shadow-xl"
      >
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
            <Phone className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="text-white font-medium">{incomingCall.name}</h3>
          <p className="text-sm text-gray-400">möchte anrufen</p>
          <p className="text-xs text-gray-500 mt-1">
            Kanal: {incomingCall.channelId}
          </p>
        </div>
        
        <div className="flex gap-2 justify-center">
          <button
            onClick={onDeclineCall}
            className="w-12 h-12 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
          <button
            onClick={() => onJoinCall(incomingCall.from, false)}
            className="w-12 h-12 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center transition-colors"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => onJoinCall(incomingCall.from, true)}
            className="w-12 h-12 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center transition-colors"
          >
            <Video className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    )
  }
  
  // Not in call - show start button
  if (!isInCall) {
    return (
      <div className="fixed bottom-24 right-20 z-40">
        <AnimatePresence>
          {showStartMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-2 right-0 bg-gray-800/95 backdrop-blur-md rounded-xl border border-gray-700 p-2 shadow-xl"
            >
              <button
                onClick={() => {
                  onStartCall(false)
                  setShowStartMenu(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                <Mic className="w-4 h-4 text-green-400" />
                <span>Voice Call</span>
              </button>
              <button
                onClick={() => {
                  onStartCall(true)
                  setShowStartMenu(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                <Video className="w-4 h-4 text-blue-400" />
                <span>Video Call</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => setShowStartMenu(!showStartMenu)}
          className="w-12 h-12 bg-gray-800/90 backdrop-blur-md rounded-full border border-gray-700 flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg"
        >
          <Phone className="w-5 h-5 text-white" />
        </button>
      </div>
    )
  }
  
  // In call - show panel
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-xl overflow-hidden transition-all ${
        isExpanded 
          ? 'inset-4' 
          : 'bottom-24 right-4 w-80'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-white">{participantArray.length} Teilnehmer</span>
          </div>
          <button
            onClick={() => setShowChannels(!showChannels)}
            className="px-2 py-1 rounded-lg text-xs text-gray-200 bg-gray-800/70 hover:bg-gray-700 transition-colors"
            title="Voice Channel"
          >
            {currentChannel?.name || 'Voice'}
          </button>
          {(activeSpeaker || lastSpeaker) && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-2 py-1 rounded-lg text-xs text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors truncate"
              title="Gruppeneinstellungen"
            >
              {activeSpeaker?.name || lastSpeaker?.name}
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            title="Audio- und Gruppeneinstellungen"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onEndCall}
            className="p-1.5 hover:bg-red-600/20 rounded-lg transition-colors text-red-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Video Grid */}
      <div className={`p-2 ${isExpanded ? 'h-[calc(100%-120px)]' : 'h-48'}`}>
        {isExpanded ? (
          <div className="grid gap-2 h-full" style={{
            gridTemplateColumns: participantArray.length > 1 
              ? `repeat(${Math.min(participantArray.length, 3)}, 1fr)` 
              : '1fr',
            gridTemplateRows: participantArray.length > 3 
              ? 'repeat(2, 1fr)' 
              : '1fr',
          }}>
            {participantArray.map(p => (
              <ParticipantVideo 
                key={p.id} 
                participant={p} 
                isLocal={p.id === currentUserId}
                isMini={false}
                isActive={p.id === activeSpeakerId}
              />
            ))}
          </div>
        ) : (
          <div className="relative h-full">
            {/* Main video (first remote or self) */}
            {otherParticipants.length > 0 ? (
              <ParticipantVideo 
                participant={otherParticipants[0]} 
                isLocal={false}
                isMini={false}
                isActive={otherParticipants[0].id === activeSpeakerId}
              />
            ) : selfParticipant ? (
              <ParticipantVideo 
                participant={selfParticipant} 
                isLocal={true}
                isMini={false}
                isActive={selfParticipant.id === activeSpeakerId}
              />
            ) : null}
            
            {/* Mini self view */}
            {selfParticipant && otherParticipants.length > 0 && (
              <div className="absolute bottom-2 right-2">
                <ParticipantVideo 
                  participant={selfParticipant} 
                  isLocal={true}
                  isMini={true}
                  isActive={selfParticipant.id === activeSpeakerId}
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="p-3 border-t border-gray-700 flex items-center justify-center gap-3">
        <button
          onClick={onToggleAudio}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            isAudioEnabled 
              ? 'bg-gray-700 hover:bg-gray-600' 
              : 'bg-red-500 hover:bg-red-400'
          }`}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        
        <button
          onClick={onToggleVideo}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            isVideoEnabled 
              ? 'bg-blue-500 hover:bg-blue-400' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        
        <button
          onClick={onEndCall}
          className="w-11 h-11 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center transition-colors"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  )
}

export default VoiceVideoPanel
