import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export function DatenschutzPage() {
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
        <h1 className="text-3xl font-bold mb-8">Datenschutzerklärung</h1>
        
        <div className="prose prose-invert prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Datenschutz auf einen Blick</h2>
            
            <h3 className="text-lg font-medium text-white/90 mt-6 mb-2">Allgemeine Hinweise</h3>
            <p className="text-white/70">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren 
              personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene 
              Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>

            <h3 className="text-lg font-medium text-white/90 mt-6 mb-2">Datenerfassung auf dieser Website</h3>
            <p className="text-white/70">
              <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong><br />
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen 
              Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
            </p>
            <p className="text-white/70 mt-4">
              <strong>Wie erfassen wir Ihre Daten?</strong><br />
              Diese Website wird auf GitHub Pages gehostet. Dabei können technisch notwendige 
              Daten wie Ihre IP-Adresse von GitHub erfasst werden. Siehe dazu die{' '}
              <a 
                href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                GitHub Datenschutzerklärung
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Hosting</h2>
            <p className="text-white/70">
              Diese Website wird bei GitHub Pages gehostet. Anbieter ist die GitHub Inc., 
              88 Colin P Kelly Jr St, San Francisco, CA 94107, USA.
            </p>
            <p className="text-white/70 mt-4">
              Wenn Sie diese Website besuchen, werden technisch notwendige Daten (z.B. IP-Adresse, 
              Datum und Uhrzeit des Zugriffs) automatisch erfasst und in Server-Log-Dateien 
              gespeichert. Diese Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
            </p>
            <p className="text-white/70 mt-4">
              Weitere Informationen zum Umgang mit Nutzerdaten finden Sie in der Datenschutzerklärung 
              von GitHub:{' '}
              <a 
                href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                GitHub Privacy Statement
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Lokale Datenspeicherung</h2>
            <p className="text-white/70">
              Diese Anwendung speichert Ihre Zeichnungen und Board-Daten ausschließlich lokal 
              in Ihrem Browser (localStorage). Diese Daten werden <strong>nicht</strong> an 
              unsere Server übertragen und verbleiben vollständig auf Ihrem Gerät.
            </p>
            <p className="text-white/70 mt-4">
              Sie können diese Daten jederzeit löschen, indem Sie die Browser-Daten für diese 
              Website löschen oder den localStorage manuell leeren.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Cookies</h2>
            <p className="text-white/70">
              Diese Website verwendet <strong>keine Tracking-Cookies</strong>. Es werden lediglich 
              technisch notwendige Funktionen wie localStorage für die App-Funktionalität verwendet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Externe Dienste</h2>
            
            <h3 className="text-lg font-medium text-white/90 mt-6 mb-2">GitHub</h3>
            <p className="text-white/70">
              Diese Website enthält Links zu GitHub. Wenn Sie diese Links nutzen, gelten die 
              Datenschutzbestimmungen von GitHub.
            </p>

            <h3 className="text-lg font-medium text-white/90 mt-6 mb-2">GitHub Sponsors / PayPal</h3>
            <p className="text-white/70">
              Wenn Sie uns über GitHub Sponsors oder PayPal unterstützen möchten, werden Sie zu 
              den entsprechenden Plattformen weitergeleitet. Dort gelten deren jeweilige 
              Datenschutzbestimmungen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Ihre Rechte</h2>
            <p className="text-white/70">
              Sie haben jederzeit das Recht:
            </p>
            <ul className="text-white/70 list-disc list-inside mt-2 space-y-1">
              <li>Auskunft über Ihre gespeicherten Daten zu erhalten</li>
              <li>Berichtigung unrichtiger Daten zu verlangen</li>
              <li>Löschung Ihrer Daten zu verlangen</li>
              <li>Einschränkung der Verarbeitung zu verlangen</li>
              <li>Der Verarbeitung zu widersprechen</li>
              <li>Datenübertragbarkeit zu verlangen</li>
            </ul>
            <p className="text-white/70 mt-4">
              Bei Fragen zum Datenschutz können Sie uns unter{' '}
              <a href="mailto:koaxial_pharao_0o@icloud.com" className="text-indigo-400 hover:text-indigo-300">
                koaxial_pharao_0o@icloud.com
              </a>{' '}
              kontaktieren. Da wir selbst keine personenbezogenen Daten speichern (außer was 
              technisch durch GitHub Pages erfasst wird), wenden Sie sich für Hosting-bezogene 
              Anfragen bitte direkt an GitHub.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Änderungen</h2>
            <p className="text-white/70">
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den 
              aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen 
              in der Datenschutzerklärung umzusetzen.
            </p>
            <p className="text-white/50 mt-4 text-sm">
              Stand: Februar 2026
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
