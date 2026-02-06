import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCodeFromUrl = searchParams.get('invite') || '';
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(inviteCodeFromUrl);
  const [inviterEmail, setInviterEmail] = useState<string | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  
  const { register, isLoading, error, clearError, checkInviteCode, user } = useAuthStore();
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/canvas');
    }
  }, [user, navigate]);
  
  // Check invite code when it changes
  useEffect(() => {
    if (inviteCode.length >= 6) {
      setIsCheckingCode(true);
      const timer = setTimeout(async () => {
        const result = await checkInviteCode(inviteCode);
        setCodeValid(result.valid);
        setInviterEmail(result.inviter_email || null);
        setIsCheckingCode(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCodeValid(null);
      setInviterEmail(null);
    }
  }, [inviteCode, checkInviteCode]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (password !== confirmPassword) {
      return;
    }
    
    if (!codeValid) {
      return;
    }
    
    const success = await register(name, email, password, inviteCode);
    if (success) {
      navigate('/canvas');
    }
  };
  
  const passwordsMatch = password === confirmPassword || confirmPassword === '';
  const canSubmit = name && email && password && confirmPassword && passwordsMatch && codeValid && !isLoading;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-gray-700/50 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center"
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-bold text-white">Willkommen</h1>
          <p className="text-gray-400 mt-2">Erstelle deinen Workspace</p>
        </div>
        
        {/* Invite Code Status */}
        <AnimatePresence mode="wait">
          {inviterEmail && codeValid && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-green-400 font-medium">Einladung von</p>
                  <p className="text-white">{inviterEmail}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30"
            >
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Invite Code */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Einladungscode *
            </label>
            <div className="relative">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all uppercase tracking-widest font-mono text-center text-lg ${
                  codeValid === null
                    ? 'border-gray-600 focus:ring-purple-500/50'
                    : codeValid
                    ? 'border-green-500 focus:ring-green-500/50'
                    : 'border-red-500 focus:ring-red-500/50'
                }`}
                maxLength={8}
              />
              {isCheckingCode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"
                  />
                </div>
              )}
              {!isCheckingCode && codeValid !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {codeValid ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            {codeValid === false && !isCheckingCode && (
              <p className="text-red-400 text-xs mt-2">
                Ungültiger oder bereits verwendeter Code
              </p>
            )}
          </div>
          
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dein Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            />
          </div>
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@example.com"
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            />
          </div>
          
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            />
          </div>
          
          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Passwort bestätigen
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                passwordsMatch
                  ? 'border-gray-600 focus:ring-purple-500/50 focus:border-purple-500'
                  : 'border-red-500 focus:ring-red-500/50'
              }`}
            />
            {!passwordsMatch && (
              <p className="text-red-400 text-xs mt-2">Passwörter stimmen nicht überein</p>
            )}
          </div>
          
          {/* Submit */}
          <motion.button
            type="submit"
            disabled={!canSubmit}
            whileHover={{ scale: canSubmit ? 1.02 : 1 }}
            whileTap={{ scale: canSubmit ? 0.98 : 1 }}
            className={`w-full py-4 rounded-xl font-semibold transition-all ${
              canSubmit
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Registrieren...
              </span>
            ) : (
              'Account erstellen'
            )}
          </motion.button>
        </form>
        
        {/* Login link */}
        <p className="text-center text-gray-400 mt-6">
          Bereits registriert?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
            Anmelden
          </Link>
        </p>
        
        {/* Back to landing */}
        <Link
          to="/"
          className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 mt-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Zurück zur Startseite
        </Link>
      </motion.div>
    </div>
  );
}
