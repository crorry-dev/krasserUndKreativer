import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold">
              ∞
            </div>
            <span className="font-semibold">Infinite Canvas</span>
          </Link>
          <Link 
            to="/"
            className="text-white/50 hover:text-white transition-colors"
          >
            ← Zurück
          </Link>
        </div>
      </header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-6 py-12"
      >
        <h1 className="text-3xl font-bold mb-8">Impressum</h1>
        
        <div className="prose prose-invert prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Angaben gemäß § 5 TMG</h2>
            <p className="text-white/70">
              Verantwortlich: crorry-dev<br />
              <span className="text-white/50 text-sm">
                (Privates, nicht-kommerzielles Open-Source-Hobbyprojekt ohne Gewinnerzielungsabsicht)
              </span>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Kontakt</h2>
            <p className="text-white/70">
              E-Mail: <a href="mailto:koaxial_pharao_0o@icloud.com" className="text-indigo-400 hover:text-indigo-300">koaxial_pharao_0o@icloud.com</a><br />
              GitHub: <a href="https://github.com/crorry-dev" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">@crorry-dev</a>
            </p>
            <p className="text-white/50 text-sm mt-2">
              Bei berechtigtem Interesse (z.B. Rechtsverletzung) wird die Identität des Betreibers offengelegt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Haftungsausschluss</h2>
            
            <h3 className="text-lg font-medium text-white/90 mt-6 mb-2">Haftung für Inhalte</h3>
            <p className="text-white/70">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, 
              Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. 
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten 
              nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als 
              Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde 
              Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige 
              Tätigkeit hinweisen.
            </p>

            <h3 className="text-lg font-medium text-white/90 mt-6 mb-2">Haftung für Links</h3>
            <p className="text-white/70">
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen 
              Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. 
              Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der 
              Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf 
              mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der 
              Verlinkung nicht erkennbar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Urheberrecht</h2>
            <p className="text-white/70">
              Der Quellcode dieser Anwendung steht unter der MIT-Lizenz und ist auf{' '}
              <a 
                href="https://github.com/crorry-dev/krasserUndKreativer" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                GitHub
              </a>{' '}
              verfügbar. Die von Nutzern erstellten Inhalte (Boards, Zeichnungen, etc.) bleiben 
              Eigentum der jeweiligen Nutzer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Streitschlichtung</h2>
            <p className="text-white/70">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) 
              bereit:{' '}
              <a 
                href="https://ec.europa.eu/consumers/odr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                https://ec.europa.eu/consumers/odr
              </a>
              <br /><br />
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
              Verbraucherschlichtungsstelle teilzunehmen, da es sich um ein kostenloses, 
              nicht-kommerzielles Open-Source-Projekt handelt.
            </p>
          </section>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-6 mt-12">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-white/50 text-sm">
          <p>© {new Date().getFullYear()} Infinite Canvas</p>
          <div className="flex gap-4">
            <Link to="/impressum" className="hover:text-white">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-white">Datenschutz</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
