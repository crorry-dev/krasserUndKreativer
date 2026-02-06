import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, RefreshCw, Sparkles, ArrowLeft, Play, Share2 } from 'lucide-react'
import { InfiniteCanvas } from '../components/Canvas'
import { useCanvasStore } from '../stores/canvasStore'

// Demo-Startobjekte für das Demo-Board
const DEMO_STARTER_OBJECTS = [
  {
    id: 'demo-welcome',
    type: 'sticky' as const,
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    data: {
      text: 'Willkommen! 👋\n\nDies ist ein öffentliches Demo-Board. Alle Besucher arbeiten hier live zusammen!',
      color: '#FEF08A',
    },
    createdAt: Date.now(),
  },
  {
    id: 'demo-info',
    type: 'sticky' as const,
    x: 350,
    y: 100,
    width: 200,
    height: 150,
    data: {
      text: 'Teste die Tools:\n\n• Zeichnen (2)\n• Formen (4)\n• Text (5)\n• Notizen (6)\n• Verbinder (7)',
      color: '#BBF7D0',
    },
    createdAt: Date.now(),
  },
  {
    id: 'demo-tip',
    type: 'sticky' as const,
    x: 600,
    y: 100,
    width: 200,
    height: 150,
    data: {
      text: 'Tipps:\n\n• Space + Drag = Pan\n• Scroll = Zoom\n• Ctrl+Z = Undo\n• Del = Löschen',
      color: '#BFDBFE',
    },
    createdAt: Date.now(),
  },
]

export function DemoPage() {
  const navigate = useNavigate()
  const [onlineCount, setOnlineCount] = useState(1)
  const [resetTime, setResetTime] = useState<Date | null>(null)
  const addObject = useCanvasStore((s) => s.addObject)
  const objects = useCanvasStore((s) => s.objects)
  const setCurrentUserId = useCanvasStore((s) => s.setCurrentUserId)
  const setUserName = useCanvasStore((s) => s.setUserName)
  
  // Initialize demo board with starter objects if empty
  useEffect(() => {
    // Generate demo user ID
    const demoUserId = `demo-user-${Math.random().toString(36).substr(2, 9)}`
    setCurrentUserId(demoUserId)
    setUserName(demoUserId, `Gast ${Math.floor(Math.random() * 1000)}`)
    
    // Only add demo objects if board is empty
    if (objects.size === 0) {
      DEMO_STARTER_OBJECTS.forEach((obj) => {
        addObject(obj, false)
      })
    }
    
    // Calculate next reset time (3:00 UTC daily)
    const now = new Date()
    const nextReset = new Date()
    nextReset.setUTCHours(3, 0, 0, 0)
    if (nextReset <= now) {
      nextReset.setDate(nextReset.getDate() + 1)
    }
    setResetTime(nextReset)
  }, [])
  
  // Simulate online count (in real implementation this would come from WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      // Random fluctuation for demo purposes
      setOnlineCount((prev) => Math.max(1, prev + Math.floor(Math.random() * 3) - 1))
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Format countdown timer
  const getCountdown = () => {
    if (!resetTime) return '--:--:--'
    
    const now = new Date()
    const diff = resetTime.getTime() - now.getTime()
    
    if (diff <= 0) return 'Reset läuft...'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Update countdown every second
  const [countdown, setCountdown] = useState(getCountdown())
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown())
    }, 1000)
    return () => clearInterval(interval)
  }, [resetTime])
  
  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    // Could show a toast notification here
  }
  
  return (
    <div className="relative w-full h-screen overflow-hidden bg-zinc-950">
      {/* Demo Banner */}
      <motion.div
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white py-2.5 px-4 shadow-lg">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                <span className="font-semibold">Demo Board</span>
              </div>
              
              <span className="hidden sm:block text-white/80 text-sm">
                Alle Besucher arbeiten hier live zusammen!
              </span>
            </div>
            
            {/* Center: Reset Timer */}
            <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              <RefreshCw className="w-4 h-4 text-white/70" />
              <span className="text-sm">
                Reset in <span className="font-mono">{countdown}</span>
              </span>
            </div>
            
            {/* Right: Online Count + Actions */}
            <div className="flex items-center gap-3">
              {/* Online Counter */}
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                <div className="relative">
                  <Users className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
                <span className="text-sm font-medium">{onlineCount} online</span>
              </div>
              
              {/* Share Button */}
              <button
                onClick={handleShare}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Teilen
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Canvas */}
      <div className="pt-12 h-full">
        <InfiniteCanvas />
      </div>
      
      {/* Online Indicator (bottom left) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-4 left-4 z-40"
      >
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-xl text-white px-4 py-2 rounded-full border border-white/10 shadow-lg">
          <div className="relative">
            <Users className="w-5 h-5 text-green-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-medium">{onlineCount} online</span>
        </div>
      </motion.div>
      
      {/* Getting Started Hint (bottom center, dismissible) */}
      <DemoHint />
    </div>
  )
}

function DemoHint() {
  const [dismissed, setDismissed] = useState(false)
  
  if (dismissed) return null
  
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="flex items-center gap-3 bg-black/80 backdrop-blur-xl text-white px-5 py-3 rounded-2xl border border-white/10 shadow-lg">
        <Play className="w-5 h-5 text-green-400" />
        <span className="text-sm">
          Klicke irgendwo und beginne zu zeichnen!
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/40 hover:text-white text-lg ml-2"
        >
          ×
        </button>
      </div>
    </motion.div>
  )
}
