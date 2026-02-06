import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import { DonationModal } from '@/components/Donation'

// Animated counter for stats
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {value.toLocaleString('de-DE')}{suffix}
    </motion.span>
  )
}

// Floating elements for background
function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/10 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  )
}

// Interactive canvas preview
function CanvasPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative mx-auto max-w-5xl mt-12"
    >
      {/* Browser frame */}
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-purple-500/10 overflow-hidden">
        {/* Browser header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gray-900/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 bg-white/5 rounded-lg text-sm text-white/50">
              infinite-canvas.app/board/mein-projekt
            </div>
          </div>
        </div>
        
        {/* Canvas preview */}
        <div className="relative h-[400px] bg-gray-950 overflow-hidden">
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, #333 1px, transparent 1px),
                linear-gradient(to bottom, #333 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
          
          {/* Simulated content */}
          <motion.div
            animate={{ x: [-10, 10, -10], y: [-5, 5, -5] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute inset-0"
          >
            {/* Sticky notes */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute top-20 left-20 w-40 h-32 bg-yellow-400 rounded-lg shadow-lg p-3 text-gray-900 font-medium rotate-[-2deg]"
            >
              💡 Neue Feature-Idee
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="absolute top-16 left-72 w-36 h-28 bg-pink-400 rounded-lg shadow-lg p-3 text-gray-900 font-medium rotate-[3deg]"
            >
              🎯 Sprint Goals
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 }}
              className="absolute top-40 left-[450px] w-44 h-36 bg-green-400 rounded-lg shadow-lg p-3 text-gray-900 font-medium rotate-[-1deg]"
            >
              ✅ Done:<br/>
              - Backend API<br/>
              - WebSocket
            </motion.div>
            
            {/* Mindmap connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <motion.path
                d="M 160 150 Q 250 120 290 130"
                stroke="white"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              />
              <motion.path
                d="M 310 160 Q 380 180 450 175"
                stroke="white"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ delay: 1.4, duration: 0.8 }}
              />
            </svg>
            
            {/* Drawing stroke */}
            <motion.svg className="absolute inset-0 w-full h-full pointer-events-none">
              <motion.path
                d="M 600 80 Q 620 120 650 100 Q 680 80 700 120 Q 720 160 680 200"
                stroke="#8b5cf6"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1.8, duration: 1.5 }}
              />
            </motion.svg>
            
            {/* Live cursors */}
            <motion.div
              animate={{ x: [0, 100, 80, 120], y: [0, 30, 60, 40] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-60 left-60"
            >
              <div className="flex items-start gap-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#4ade80">
                  <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.35-.85L6.35 3.36c-.28-.21-.85 0-.85.35z" />
                </svg>
                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Max</span>
              </div>
            </motion.div>
            
            <motion.div
              animate={{ x: [200, 150, 180, 160], y: [100, 140, 120, 150] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute top-20 left-[500px]"
            >
              <div className="flex items-start gap-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fb923c">
                  <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.35-.85L6.35 3.36c-.28-.21-.85 0-.85.35z" />
                </svg>
                <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">Lisa</span>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Zoom indicator */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur rounded-full text-sm">
            <span className="text-green-400">●</span>
            <span className="text-white/70">100%</span>
          </div>
          
          {/* Collaboration indicator */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur rounded-full text-sm">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-gray-950" />
              <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-gray-950" />
              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-gray-950" />
            </div>
            <span className="text-white/70">3 online</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Feature card with hover effect
function FeatureCard({ icon, title, description, delay = 0 }: {
  icon: string
  title: string
  description: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-indigo-500/50 transition-colors"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-indigo-300 transition-colors">
        {title}
      </h3>
      <p className="text-white/60">{description}</p>
    </motion.div>
  )
}

// Pricing/donation section
function DonationSection({ onDonate }: { onDonate: () => void }) {
  const costs = [
    { label: '1 Stunde Server', amount: '0.01€' },
    { label: '1 Tag Hosting', amount: '0.34€' },
    { label: '1 Woche', amount: '2.38€' },
    { label: '1 Monat', amount: '~10€' },
  ]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl" />
      
      <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12">
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium mb-4">
            100% Kostenlos
          </span>
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Für immer kostenlos.
            <br />
            <span className="text-white/50">Mit Herz unterstützt.</span>
          </h3>
          <p className="text-white/60 max-w-2xl mx-auto">
            Infinite Canvas ist und bleibt kostenlos. Keine versteckten Kosten, kein Premium-Abo.
            Wenn dir das Projekt gefällt, kannst du mit einer kleinen Spende helfen, die Serverkosten zu decken.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {costs.map((cost) => (
            <div key={cost.label} className="text-center p-4 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-white">{cost.amount}</div>
              <div className="text-sm text-white/50">{cost.label}</div>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            onClick={onDonate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-semibold text-lg"
          >
            ☕ Einen Kaffee spendieren
          </motion.button>
          <span className="text-white/40">oder</span>
          <button className="text-indigo-400 hover:text-indigo-300 font-medium">
            Einfach so nutzen →
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Invite system teaser
function InviteSection() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="relative py-24"
    >
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full text-purple-300 mb-6">
          <span className="text-xl">🎁</span>
          <span className="font-medium">Exklusives Einladungssystem</span>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          1 Nutzer. 1 Einladung.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            Wachstum mit Qualität.
          </span>
        </h2>
        
        <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
          Jeder registrierte Nutzer kann genau <strong className="text-white">eine Person</strong> einladen.
          So wächst unsere Community organisch – mit Menschen, die wirklich dabei sein wollen.
        </p>
        
        {/* Visual representation */}
        <div className="relative h-64 max-w-lg mx-auto">
          {/* Tree visualization */}
          <svg className="w-full h-full" viewBox="0 0 400 200">
            {/* Connections */}
            <motion.line
              x1="200" y1="40" x2="100" y2="100"
              stroke="url(#gradient)" strokeWidth="2"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
            <motion.line
              x1="200" y1="40" x2="300" y2="100"
              stroke="url(#gradient)" strokeWidth="2"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.5 }}
            />
            <motion.line
              x1="100" y1="100" x2="60" y2="160"
              stroke="url(#gradient)" strokeWidth="2"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.5 }}
            />
            <motion.line
              x1="300" y1="100" x2="340" y2="160"
              stroke="url(#gradient)" strokeWidth="2"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.9, duration: 0.5 }}
            />
            
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            
            {/* Nodes */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <circle cx="200" cy="40" r="24" fill="url(#gradient)" />
              <text x="200" y="45" textAnchor="middle" fill="white" fontSize="14">Du</text>
            </motion.g>
            
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <circle cx="100" cy="100" r="20" fill="#4ade80" />
              <text x="100" y="105" textAnchor="middle" fill="white" fontSize="12">+1</text>
            </motion.g>
            
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <circle cx="300" cy="100" r="20" fill="#60a5fa" opacity="0.5" strokeDasharray="4" stroke="#60a5fa" strokeWidth="2" />
              <text x="300" y="105" textAnchor="middle" fill="#60a5fa" fontSize="12">?</text>
            </motion.g>
            
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
            >
              <circle cx="60" cy="160" r="16" fill="#4ade80" />
            </motion.g>
            
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1 }}
            >
              <circle cx="340" cy="160" r="16" fill="#60a5fa" opacity="0.3" strokeDasharray="4" stroke="#60a5fa" strokeWidth="2" />
            </motion.g>
          </svg>
        </div>
        
        <p className="text-white/40 text-sm">
          Noch keine Einladung? Frag jemanden, der schon dabei ist! 🤝
        </p>
      </div>
    </motion.div>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const [donationOpen, setDonationOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({ target: containerRef })
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0])
  
  const createNewBoard = () => {
    const boardId = `board-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    navigate(`/board/${boardId}`)
  }
  
  const features = [
    {
      icon: '∞',
      title: 'Unendliches Canvas',
      description: 'Scrolle und zoome ohne Grenzen. Von Überblick bis Pixelniveau – das Grid passt sich automatisch an.',
    },
    {
      icon: '👥',
      title: 'Echtzeit-Kollaboration',
      description: 'Sieh live die Cursor aller Teilnehmer. Änderungen erscheinen sofort bei allen.',
    },
    {
      icon: '🔗',
      title: 'Einfaches Teilen',
      description: 'Erstelle Gast-Links mit optionalem Passwort. Perfekt für Workshops und Teams.',
    },
    {
      icon: '⏱️',
      title: 'Versions-History',
      description: 'Gehe zu jedem Zeitpunkt zurück. Jede Änderung wird automatisch gespeichert.',
    },
    {
      icon: '📱',
      title: 'Mobile-First',
      description: 'Funktioniert auf allen Geräten. Touch-Gesten für natürliches Arbeiten.',
    },
    {
      icon: '🚀',
      title: 'Blitzschnell',
      description: 'Nur sichtbare Bereiche werden geladen. Sparse Rendering für beste Performance.',
    },
  ]
  
  return (
    <div ref={containerRef} className="min-h-screen bg-gray-950 text-white">
      <FloatingElements />
      
      {/* Hero Section */}
      <header className="relative min-h-screen">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 via-gray-950 to-gray-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-indigo-500/30 via-purple-500/10 to-transparent blur-3xl" />
        
        {/* Navigation */}
        <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-500/30">
              ∞
            </div>
            <div>
              <span className="font-bold text-xl">Infinite Canvas</span>
              <span className="block text-xs text-white/50">Grenzenlos kreativ</span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <button 
              onClick={() => setDonationOpen(true)}
              className="hidden sm:block text-white/60 hover:text-white transition-colors"
            >
              Unterstützen
            </button>
            <button
              onClick={createNewBoard}
              className="px-5 py-2.5 bg-white text-gray-900 hover:bg-white/90 rounded-xl font-semibold transition-colors"
            >
              Jetzt starten
            </button>
          </motion.div>
        </nav>
        
        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-sm mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/70">Kostenlos & Open Source</span>
            </motion.div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-[1.1]">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-200">
                Eine Tafel.
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                Unendliche
              </span>
              <br />
              <span className="text-white">
                Möglichkeiten.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed">
              Brainstorming. Mindmaps. Workshops. Projektplanung.
              <br className="hidden md:block" />
              Alles auf einer <strong className="text-white/80">unendlichen Leinwand</strong> – in Echtzeit mit deinem Team.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <motion.button
                onClick={createNewBoard}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl font-bold text-xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow"
              >
                ✨ Board erstellen – kostenlos
              </motion.button>
            </div>
            
            <p className="text-white/30 text-sm">
              Keine Registrierung erforderlich • Kein Kreditkarte • Für immer kostenlos
            </p>
          </motion.div>
        </div>
        
        {/* Canvas Preview */}
        <div className="relative z-10 px-6">
          <CanvasPreview />
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          style={{ opacity: headerOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-white/30"
          >
            <span className="text-sm">Mehr entdecken</span>
            <span>↓</span>
          </motion.div>
        </motion.div>
      </header>
      
      {/* Stats */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '∞', label: 'Canvas Größe', suffix: '' },
              { value: 100, label: 'Nutzer pro Board', suffix: '+' },
              { value: 0, label: 'Kosten', suffix: '€' },
              { value: 50, label: 'ms Latenz', suffix: '' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                  {typeof stat.value === 'number' ? (
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  ) : (
                    stat.value
                  )}
                </div>
                <div className="text-white/50">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Features Grid */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Alles was du brauchst
            </h2>
            <p className="text-xl text-white/50">
              Keine Kompromisse. Keine versteckten Kosten.
            </p>
          </motion.div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard 
                key={feature.title}
                {...feature}
                delay={i * 0.1}
              />
            ))}
          </div>
        </div>
      </section>
      
      {/* Invite System */}
      <InviteSection />
      
      {/* Donation Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <DonationSection onDonate={() => setDonationOpen(true)} />
        </div>
      </section>
      
      {/* Final CTA */}
      <section className="py-24 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Bereit loszulegen?
          </h2>
          <p className="text-xl text-white/50 mb-8">
            Erstelle jetzt dein erstes Board. In Sekunden.
          </p>
          <motion.button
            onClick={createNewBoard}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="px-10 py-5 bg-white text-gray-900 rounded-2xl font-bold text-xl hover:bg-white/90 transition-colors"
          >
            Jetzt starten →
          </motion.button>
        </motion.div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold">
                ∞
              </div>
              <span className="font-semibold">Infinite Canvas</span>
            </div>
            
            <div className="flex items-center gap-6 text-white/50">
              <button onClick={() => setDonationOpen(true)} className="hover:text-white transition-colors">
                Spenden
              </button>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">Datenschutz</a>
            </div>
            
            <p className="text-white/30 text-sm">
              Made with 💜 • Open Source
            </p>
          </div>
        </div>
      </footer>
      
      {/* Donation Modal */}
      <DonationModal isOpen={donationOpen} onClose={() => setDonationOpen(false)} />
    </div>
  )
}
