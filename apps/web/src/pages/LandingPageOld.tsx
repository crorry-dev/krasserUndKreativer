import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { DonationModal } from '@/components/Donation'

export function LandingPage() {
  const navigate = useNavigate()
  const [donationOpen, setDonationOpen] = useState(false)
  
  const createNewBoard = () => {
    const boardId = `board-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    navigate(`/board/${boardId}`)
  }
  
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Hero Section */}
      <header className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent" />
        
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-xl">
              ∞
            </div>
            <span className="font-semibold text-xl">Infinite Canvas</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setDonationOpen(true)}
              className="text-white/70 hover:text-white transition-colors"
            >
              Unterstützen
            </button>
            <button
              onClick={createNewBoard}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Los geht's →
            </button>
          </div>
        </nav>
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent">
              Eine unendliche Tafel.
              <br />
              Grenzenlose Ideen.
            </h1>
            
            <p className="text-xl md:text-2xl text-white/60 mb-8 max-w-2xl mx-auto">
              Kollaboriere in Echtzeit, erstelle Mindmaps, plane Projekte – 
              alles auf einer unendlichen Leinwand.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={createNewBoard}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
              >
                Neues Board erstellen
              </motion.button>
              
              <button className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-lg transition-colors">
                Board beitreten
              </button>
            </div>
          </motion.div>
        </div>
      </header>
      
      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Alles was du brauchst
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🎨',
                title: 'Unendliches Canvas',
                description: 'Keine Grenzen. Scrolle endlos in alle Richtungen. Nur Bereiche mit Inhalt werden geladen.',
              },
              {
                icon: '👥',
                title: 'Echtzeit-Kollaboration',
                description: 'Sieh live die Cursor und Änderungen aller Teilnehmer. Perfekt für Brainstorming und Workshops.',
              },
              {
                icon: '🔗',
                title: 'Einfaches Teilen',
                description: 'Erstelle Links mit Ablaufdatum und optionalem Passwort. Keine Anmeldung für Gäste nötig.',
              },
              {
                icon: '🕐',
                title: 'Vollständiger Verlauf',
                description: 'Jede Änderung wird gespeichert. Springe jederzeit zu einem früheren Zustand zurück.',
              },
              {
                icon: '📱',
                title: 'Mobile-First',
                description: 'Touch-optimiert mit Gesten für Zoom und Pan. Funktioniert perfekt auf Tablet und Smartphone.',
              },
              {
                icon: '💜',
                title: 'Pay-What-You-Want',
                description: 'Kostenlos nutzbar. Unterstütze uns mit dem Betrag, der für dich passt.',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/60">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-t from-indigo-500/10 to-transparent">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Bereit loszulegen?
          </h2>
          <p className="text-xl text-white/60 mb-8">
            Erstelle jetzt dein erstes Board. Keine Anmeldung erforderlich.
          </p>
          <motion.button
            onClick={createNewBoard}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-semibold text-xl shadow-lg shadow-indigo-500/25"
          >
            Jetzt starten →
          </motion.button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/50">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">
              ∞
            </div>
            <span>Infinite Canvas</span>
          </div>
          
          <div className="flex items-center gap-6 text-white/50 text-sm">
            <button 
              onClick={() => setDonationOpen(true)}
              className="hover:text-white transition-colors"
            >
              Unterstützen 💜
            </button>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Datenschutz</a>
            <a href="#" className="hover:text-white transition-colors">Impressum</a>
          </div>
        </div>
      </footer>
      
      <DonationModal isOpen={donationOpen} onClose={() => setDonationOpen(false)} />
    </div>
  )
}
