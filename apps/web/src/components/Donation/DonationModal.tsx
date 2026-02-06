import { motion, AnimatePresence } from 'framer-motion'
import { CloseIcon } from '@/components/Icons'

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
}

const SPONSOR_TIERS = [
  { amount: 2, emoji: '☕', label: 'Kaffee' },
  { amount: 5, emoji: '🍕', label: 'Pizza' },
  { amount: 10, emoji: '💾', label: 'Server' },
  { amount: 25, emoji: '🌟', label: 'Sponsor' },
]

const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/crorry-dev'
const PAYPAL_URL = 'https://paypal.me/tobcro'

export function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const openGitHubSponsors = () => {
    window.open(GITHUB_SPONSORS_URL, '_blank', 'noopener,noreferrer')
  }
  
  const openPayPal = () => {
    window.open(PAYPAL_URL, '_blank', 'noopener,noreferrer')
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
            className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-gray-900 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Unterstütze uns 💜
                  </h2>
                  <p className="text-white/50 text-xs mt-0.5">
                    Open Source lebt von der Community!
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-3">
              {/* GitHub Sponsors Info */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                <svg className="w-6 h-6 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <div>
                  <div className="font-medium text-white text-sm">GitHub Sponsors</div>
                  <div className="text-white/50 text-xs">Direkt über GitHub unterstützen</div>
                </div>
              </div>
              
              {/* Sponsor Tiers - Compact */}
              <div className="grid grid-cols-4 gap-2">
                {SPONSOR_TIERS.map((tier) => (
                  <div
                    key={tier.amount}
                    className="p-2 rounded-lg border border-white/10 bg-white/5 text-center"
                  >
                    <div className="text-lg">{tier.emoji}</div>
                    <div className="text-white font-medium text-xs">{tier.amount}€</div>
                    <div className="text-white/40 text-[10px]">{tier.label}</div>
                  </div>
                ))}
              </div>
              
              {/* CTA Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={openGitHubSponsors}
                  className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-white/10"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
                <button
                  onClick={openPayPal}
                  className="py-2.5 bg-[#0070ba] hover:bg-[#005ea6] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.629h6.724c2.241 0 3.875.502 4.856 1.493.968.982 1.323 2.396.957 4.072-.023.104-.049.211-.076.32-.027.107-.056.218-.088.333-.313 1.127-.816 2.093-1.496 2.869-.689.788-1.536 1.391-2.519 1.793-1.002.41-2.13.617-3.352.617H8.56a.77.77 0 0 0-.758.63l-.726 4.12zm13.273-14.07c-.006.032-.012.063-.02.095a9.075 9.075 0 0 1-.104.438c-.4 1.467-1.125 2.559-2.156 3.246-1.04.694-2.391 1.046-4.016 1.046H11.62l-1.3 7.377h3.86c.199 0 .368-.131.4-.313l.016-.08.618-3.91.04-.217a.413.413 0 0 1 .407-.318h.255c1.66 0 2.96-.337 3.865-1.001.864-.635 1.467-1.524 1.792-2.643.138-.474.218-.909.246-1.307.028-.398-.001-.755-.086-1.07a2.057 2.057 0 0 0-.383-.743z"/>
                  </svg>
                  PayPal
                </button>
              </div>
              
              <p className="text-center text-white/30 text-[10px]">
                Einmalig oder monatlich unterstützen
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
