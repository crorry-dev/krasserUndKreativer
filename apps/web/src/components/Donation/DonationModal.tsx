import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloseIcon } from '@/components/Icons'

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
}

const DONATION_OPTIONS = [
  { amount: 2, emoji: '☕', label: 'Kaffee', description: 'Für einen Kaffee zwischendurch' },
  { amount: 5, emoji: '🍕', label: 'Pizza-Ecke', description: 'Für eine leckere Pizza-Pause' },
  { amount: 10, emoji: '📚', label: 'Buch', description: 'Für Weiterbildung und neue Features' },
  { amount: 25, emoji: '🎮', label: 'Indie Game', description: 'Unterstütze uns wie einen Indie-Dev' },
  { amount: 50, emoji: '🌟', label: 'Super-Supporter', description: 'Du bist großartig!' },
]

const COST_COMPARISONS = [
  { amount: 0.34, label: '1 Tag Hosting', emoji: '🖥️' },
  { amount: 0.50, label: '1 GB Datentransfer', emoji: '📶' },
  { amount: 2.00, label: '1 Woche Hosting', emoji: '⚡' },
  { amount: 8.00, label: '1 Monat Hosting', emoji: '🚀' },
]

export function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleDonate = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount
    if (!amount || amount < 1) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      // Check if Stripe is configured
      const configResponse = await fetch('/api/payments/config')
      const config = await configResponse.json()
      
      if (!config.configured) {
        // Stripe not configured - show demo success
        console.log('[Donation] Stripe not configured, showing demo mode')
        await new Promise(resolve => setTimeout(resolve, 1000))
        setShowSuccess(true)
        setIsProcessing(false)
        return
      }
      
      // Create Stripe checkout session
      const response = await fetch('/api/payments/create-donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Stripe uses cents
          currency: 'eur',
          success_url: `${window.location.origin}?donation=success`,
          cancel_url: `${window.location.origin}?donation=cancelled`,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Zahlung konnte nicht gestartet werden')
      }
      
      const { checkout_url } = await response.json()
      
      // Redirect to Stripe Checkout
      window.location.href = checkout_url
      
    } catch (err) {
      console.error('Donation error:', err)
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      setIsProcessing(false)
    }
  }
  
  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount
  
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
          >
            {showSuccess ? (
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Vielen Dank!</h2>
                <p className="text-white/60 mb-6">
                  Deine Unterstützung hilft uns, Infinite Canvas weiterzuentwickeln.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                >
                  Schließen
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        Unterstütze uns 💜
                      </h2>
                      <p className="text-white/50 text-sm mt-1">
                        Pay-what-you-want – Jeder Beitrag hilft!
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
                
                {/* Amount Options */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {DONATION_OPTIONS.slice(0, 3).map((option) => (
                      <button
                        key={option.amount}
                        onClick={() => {
                          setSelectedAmount(option.amount)
                          setCustomAmount('')
                        }}
                        className={`p-3 rounded-xl border transition-all ${
                          selectedAmount === option.amount
                            ? 'border-indigo-500 bg-indigo-500/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-2xl mb-1">{option.emoji}</div>
                        <div className="text-white font-semibold">{option.amount}€</div>
                        <div className="text-white/50 text-xs">{option.label}</div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {DONATION_OPTIONS.slice(3).map((option) => (
                      <button
                        key={option.amount}
                        onClick={() => {
                          setSelectedAmount(option.amount)
                          setCustomAmount('')
                        }}
                        className={`p-3 rounded-xl border transition-all ${
                          selectedAmount === option.amount
                            ? 'border-indigo-500 bg-indigo-500/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{option.emoji}</span>
                          <div className="text-left">
                            <div className="text-white font-semibold">{option.amount}€</div>
                            <div className="text-white/50 text-xs">{option.label}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom Amount */}
                  <div className="relative">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value)
                        setSelectedAmount(null)
                      }}
                      placeholder="Eigener Betrag"
                      min="1"
                      step="0.01"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-white/30"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50">€</span>
                  </div>
                  
                  {/* Cost Comparison */}
                  {finalAmount && finalAmount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 bg-white/5 rounded-xl"
                    >
                      <p className="text-white/60 text-sm mb-2">Das entspricht:</p>
                      <div className="flex flex-wrap gap-2">
                        {COST_COMPARISONS.filter(c => c.amount <= (finalAmount || 0)).map((comparison) => {
                          const count = Math.floor((finalAmount || 0) / comparison.amount)
                          return (
                            <span
                              key={comparison.label}
                              className="px-2 py-1 bg-white/10 rounded text-xs text-white/70"
                            >
                              {comparison.emoji} ~{count}x {comparison.label}
                            </span>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
                
                {/* Footer */}
                <div className="p-6 border-t border-white/10">
                  {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  
                  <button
                    onClick={handleDonate}
                    disabled={!finalAmount || finalAmount < 1 || isProcessing}
                    className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Wird verarbeitet...
                      </span>
                    ) : finalAmount ? (
                      `${finalAmount.toFixed(2)}€ spenden`
                    ) : (
                      'Betrag wählen'
                    )}
                  </button>
                  
                  <p className="text-center text-white/40 text-xs mt-3">
                    Sichere Zahlung via Stripe. Keine Verpflichtungen.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
