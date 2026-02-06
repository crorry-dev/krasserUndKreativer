import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'

// ============================================================================
// SVG Icons (keine Emojis!)
// ============================================================================

const InfinityIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
  </svg>
)

const UsersIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const LinkIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const HistoryIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
)

const SmartphoneIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </svg>
)

const ZapIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)

const LightbulbIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
)

const WrenchIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

const FileTextIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
)

const SparklesIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
    <path d="M4 17v2" />
    <path d="M5 18H3" />
  </svg>
)

const ArrowRightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
)

const ChevronDownIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const GithubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
)

const GlobeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
)

const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const TargetIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
)

// ============================================================================
// Logo Component - Minimalistisches, einzigartiges Design
// ============================================================================

interface LogoProps {
  size?: number
  className?: string
  showText?: boolean
}

export function Logo({ size = 48, className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 48 48" 
        fill="none"
        className="flex-shrink-0"
      >
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        
        {/* Background rounded square */}
        <rect 
          x="2" y="2" 
          width="44" height="44" 
          rx="12" 
          fill="url(#logoGradient)"
        />
        
        {/* Infinity symbol - stylized */}
        <path
          d="M33 24c0-3.5-2.5-6-6-6-2.5 0-4.5 1.5-6 3.5-1.5-2-3.5-3.5-6-3.5-3.5 0-6 2.5-6 6s2.5 6 6 6c2.5 0 4.5-1.5 6-3.5 1.5 2 3.5 3.5 6 3.5 3.5 0 6-2.5 6-6z"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Inner glow dots */}
        <circle cx="15" cy="24" r="1.5" fill="white" opacity="0.8" />
        <circle cx="33" cy="24" r="1.5" fill="white" opacity="0.8" />
      </svg>
      
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-xl leading-tight">Infinite Canvas</span>
          <span className="text-xs text-white/50 leading-tight">Grenzenlos kreativ</span>
        </div>
      )}
    </div>
  )
}

// Favicon/Webicon Export (als separate SVG)
export const FaviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#g)"/>
  <path d="M33 24c0-3.5-2.5-6-6-6-2.5 0-4.5 1.5-6 3.5-1.5-2-3.5-3.5-6-3.5-3.5 0-6 2.5-6 6s2.5 6 6 6c2.5 0 4.5-1.5 6-3.5 1.5 2 3.5 3.5 6 3.5 3.5 0 6-2.5 6-6z" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <circle cx="15" cy="24" r="1.5" fill="white" opacity="0.8"/>
  <circle cx="33" cy="24" r="1.5" fill="white" opacity="0.8"/>
</svg>`

// ============================================================================
// Animated Components
// ============================================================================

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

// ============================================================================
// Apple-Style Scroll-Zoom Section
// ============================================================================

interface ZoomSectionProps {
  children: React.ReactNode
  className?: string
}

function ZoomSection({ children, className = "" }: ZoomSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })
  
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })
  
  const scale = useTransform(smoothProgress, [0, 0.3, 0.7, 1], [0.8, 1, 1, 0.8])
  const opacity = useTransform(smoothProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const y = useTransform(smoothProgress, [0, 0.3, 0.7, 1], [100, 0, 0, -100])
  
  return (
    <motion.div
      ref={ref}
      style={{ scale, opacity, y }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Canvas Preview with Zoom Effect
// ============================================================================

function CanvasPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })
  
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1.05, 0.95])
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [10, 0, -5])
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative mx-auto max-w-5xl mt-12 perspective-1000"
    >
      <motion.div 
        style={{ scale, rotateX }}
        className="transform-gpu"
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
              {/* Sticky notes - mit Icons statt Emojis */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute top-20 left-20 w-40 h-32 bg-yellow-400 rounded-lg shadow-lg p-3 text-gray-900 font-medium rotate-[-2deg]"
              >
                <LightbulbIcon className="w-5 h-5 mb-1 text-yellow-700" />
                Neue Feature-Idee
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="absolute top-16 left-72 w-36 h-28 bg-pink-400 rounded-lg shadow-lg p-3 text-gray-900 font-medium rotate-[3deg]"
              >
                <TargetIcon className="w-5 h-5 mb-1 text-pink-700" />
                Sprint Goals
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 }}
                className="absolute top-40 left-[450px] w-44 h-36 bg-green-400 rounded-lg shadow-lg p-3 text-gray-900 font-medium rotate-[-1deg]"
              >
                <CheckIcon className="w-5 h-5 mb-1 text-green-700" />
                Done:<br/>
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
                  transition={{ delay: 1.6, duration: 1 }}
                />
              </motion.svg>
              
              {/* Remote cursor simulation */}
              <motion.div
                animate={{ 
                  x: [200, 350, 400, 300, 200],
                  y: [250, 200, 280, 320, 250],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5.65 12.46L12 3.1l6.35 9.36c.18.26.18.6 0 .87-.18.26-.5.4-.83.36L14 13.23V18.5a1.5 1.5 0 01-1.5 1.5h-1a1.5 1.5 0 01-1.5-1.5v-5.27l-3.52.46a.87.87 0 01-.83-.36.87.87 0 010-.87z"
                    fill="#ec4899"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                </svg>
                <div className="ml-4 mt-1 px-2 py-0.5 bg-pink-500 rounded text-xs text-white whitespace-nowrap">
                  Sarah
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// Feature Card
// ============================================================================

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  delay?: number
}

function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative p-6 bg-white/5 hover:bg-white/10 backdrop-blur rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300"
    >
      <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
    </motion.div>
  )
}

// ============================================================================
// Community & Open Source Section
// ============================================================================

function CommunitySection() {
  return (
    <ZoomSection className="relative py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full text-green-300 mb-6">
          <GlobeIcon className="w-5 h-5" />
          <span className="font-medium">Open Source Community Projekt</span>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Von der Community.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
            Für die Community.
          </span>
        </h2>
        
        <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
          Infinite Canvas ist ein <strong className="text-white">100% Open Source Projekt</strong> unter der MIT-Lizenz.
          Das bedeutet: Du kannst den Code lesen, modifizieren und für deine eigenen Projekte nutzen – komplett kostenlos.
        </p>
        
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-white/5 rounded-2xl border border-white/10"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400">
              <LightbulbIcon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Ideen willkommen</h3>
            <p className="text-white/50 text-sm">
              Hast du eine Feature-Idee? Öffne ein Issue oder starte eine Diskussion!
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-white/5 rounded-2xl border border-white/10"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <WrenchIcon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Pull Requests</h3>
            <p className="text-white/50 text-sm">
              Du möchtest selbst beitragen? PRs werden aktiv reviewed und gemerged.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-white/5 rounded-2xl border border-white/10"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <FileTextIcon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">MIT Lizenz</h3>
            <p className="text-white/50 text-sm">
              Nutze den Code wie du willst – privat oder kommerziell, ohne Einschränkungen.
            </p>
          </motion.div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.a
            href="https://github.com/crorry-dev/krasserUndKreativer"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
          >
            <GithubIcon className="w-5 h-5" />
            GitHub Repository
          </motion.a>
          
          <motion.a
            href="https://github.com/crorry-dev/krasserUndKreativer/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-semibold"
          >
            <SparklesIcon className="w-5 h-5" />
            Feature vorschlagen
          </motion.a>
        </div>
        
        <p className="text-white/30 text-sm mt-8">
          Kein Ich-Projekt, sondern ein Wir-Projekt. Jeder kann mitmachen!
        </p>
      </div>
    </ZoomSection>
  )
}

// ============================================================================
// Main Landing Page
// ============================================================================

export function LandingPage() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({ target: containerRef })
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0])
  
  const createNewBoard = () => {
    const boardId = `board-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    navigate(`/board/${boardId}`)
  }
  
  const features = [
    {
      icon: <InfinityIcon className="w-6 h-6" />,
      title: 'Unendliches Canvas',
      description: 'Scrolle und zoome ohne Grenzen. Von Überblick bis Pixelniveau – das Grid passt sich automatisch an.',
    },
    {
      icon: <UsersIcon className="w-6 h-6" />,
      title: 'Echtzeit-Kollaboration',
      description: 'Sieh live die Cursor aller Teilnehmer. Änderungen erscheinen sofort bei allen.',
    },
    {
      icon: <LinkIcon className="w-6 h-6" />,
      title: 'Einfaches Teilen',
      description: 'Erstelle Gast-Links mit optionalem Passwort. Perfekt für Workshops und Teams.',
    },
    {
      icon: <HistoryIcon className="w-6 h-6" />,
      title: 'Versions-History',
      description: 'Gehe zu jedem Zeitpunkt zurück. Jede Änderung wird automatisch gespeichert.',
    },
    {
      icon: <SmartphoneIcon className="w-6 h-6" />,
      title: 'Mobile-First',
      description: 'Funktioniert auf allen Geräten. Touch-Gesten für natürliches Arbeiten.',
    },
    {
      icon: <ZapIcon className="w-6 h-6" />,
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
          >
            <Logo size={48} />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <a 
              href="https://github.com/crorry-dev/krasserUndKreativer"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <GithubIcon className="w-5 h-5" />
              <span>GitHub</span>
            </a>
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
                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl font-bold text-xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow flex items-center justify-center gap-2"
              >
                <SparklesIcon className="w-6 h-6" />
                Board erstellen – kostenlos
              </motion.button>
            </div>
            
            <p className="text-white/30 text-sm">
              Keine Registrierung erforderlich • Keine Kreditkarte • Für immer kostenlos
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
            <ChevronDownIcon className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </header>
      
      {/* Stats with Zoom Effect */}
      <ZoomSection className="py-20 px-6 border-t border-white/5">
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
      </ZoomSection>
      
      {/* Features Grid with Zoom Effect */}
      <ZoomSection className="py-24 px-6">
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
      </ZoomSection>
      
      {/* Community & Open Source Section */}
      <CommunitySection />
      
      {/* Final CTA with Zoom Effect */}
      <ZoomSection className="py-24 px-6 text-center">
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
            className="px-10 py-5 bg-white text-gray-900 rounded-2xl font-bold text-xl hover:bg-white/90 transition-colors inline-flex items-center gap-2"
          >
            Jetzt starten
            <ArrowRightIcon className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </ZoomSection>
      
      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo size={40} />
            
            <div className="flex items-center gap-6 text-white/50">
              <a 
                href="https://github.com/crorry-dev/krasserUndKreativer" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-white transition-colors flex items-center gap-2"
              >
                <GithubIcon className="w-4 h-4" />
                GitHub
              </a>
              <a href="/impressum" className="hover:text-white transition-colors">Impressum</a>
              <a href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</a>
            </div>
            
            <p className="text-white/30 text-sm">
              Open Source • MIT Lizenz
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
