import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

interface InviteTree {
  user_id: string;
  email: string;
  invite_code: string;
  invited?: InviteTree;
  total_donated: number;
}

export function InvitePage() {
  const navigate = useNavigate();
  const { user, token, getMyInvite, getInviteTree, fetchMe } = useAuthStore();
  const [inviteInfo, setInviteInfo] = useState<{
    invite_code: string;
    has_used: boolean;
    invited_user?: string;
  } | null>(null);
  const [inviteTree, setInviteTree] = useState<InviteTree | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    const loadData = async () => {
      await fetchMe();
      const [invite, tree] = await Promise.all([getMyInvite(), getInviteTree()]);
      setInviteInfo(invite);
      setInviteTree(tree);
      setLoading(false);
    };
    
    loadData();
  }, [token, navigate, fetchMe, getMyInvite, getInviteTree]);
  
  const copyInviteLink = () => {
    const link = `${window.location.origin}/register?invite=${inviteInfo?.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const copyInviteCode = () => {
    if (inviteInfo?.invite_code) {
      navigator.clipboard.writeText(inviteInfo.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }
  
  // Render invite tree recursively
  const renderTree = (node: InviteTree, depth = 0): React.ReactNode => {
    const isCurrentUser = node.user_id === user?.id;
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.1 }}
        key={node.user_id}
        className="relative"
      >
        {depth > 0 && (
          <div className="absolute left-0 top-0 w-8 h-8 border-l-2 border-b-2 border-gray-600 rounded-bl-xl -translate-x-4" />
        )}
        <div
          className={`flex items-center gap-3 p-4 rounded-xl ${
            isCurrentUser
              ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30'
              : 'bg-gray-800/50 border border-gray-700/50'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isCurrentUser ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span className="text-white font-bold">
              {node.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">
              {node.email}
              {isCurrentUser && (
                <span className="ml-2 text-xs text-purple-400">(Du)</span>
              )}
            </p>
            <p className="text-gray-400 text-sm font-mono">{node.invite_code}</p>
          </div>
          {node.total_donated > 0 && (
            <div className="flex items-center gap-1 text-yellow-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="text-sm font-medium">
                {node.total_donated.toFixed(2)}€
              </span>
            </div>
          )}
        </div>
        
        {node.invited && (
          <div className="ml-8 mt-4 pl-4 border-l-2 border-gray-700">
            {renderTree(node.invited, depth + 1)}
          </div>
        )}
      </motion.div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      
      {/* Header */}
      <header className="relative z-10 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg">Infinite Canvas</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link
              to="/canvas"
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Zum Canvas
            </Link>
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm">{user?.email}</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Deine Einladung</h1>
            <p className="text-gray-400">
              Jeder Nutzer kann genau eine Person einladen
            </p>
          </div>
          
          {/* Invite Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50"
          >
            {inviteInfo?.has_used ? (
              // Already used invite
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Einladung verwendet
                </h2>
                <p className="text-gray-400 mb-4">
                  Du hast <span className="text-white">{inviteInfo.invited_user}</span> eingeladen
                </p>
                <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700">
                  <p className="text-gray-500 text-sm">Dein Einladungscode</p>
                  <p className="text-gray-400 font-mono text-lg line-through">
                    {inviteInfo.invite_code}
                  </p>
                </div>
              </div>
            ) : (
              // Invite available
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Lade eine Person ein
                </h2>
                <p className="text-gray-400 mb-6">
                  Du kannst genau <span className="text-purple-400 font-semibold">eine Person</span> einladen
                </p>
                
                {/* Invite Code Display */}
                <div className="p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 mb-6">
                  <p className="text-gray-400 text-sm mb-2">Dein Einladungscode</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-bold text-white tracking-widest">
                      {inviteInfo?.invite_code}
                    </span>
                    <motion.button
                      onClick={copyInviteCode}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.svg
                            key="check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="w-5 h-5 text-green-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </motion.svg>
                        ) : (
                          <motion.svg
                            key="copy"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="w-5 h-5 text-gray-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>
                
                {/* Share Button */}
                <motion.button
                  onClick={copyInviteLink}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {copied ? 'Link kopiert!' : 'Einladungslink kopieren'}
                </motion.button>
              </div>
            )}
          </motion.div>
          
          {/* Invite Tree */}
          {inviteTree && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50"
            >
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Dein Einladungsbaum
              </h2>
              <div className="space-y-4">
                {renderTree(inviteTree)}
              </div>
            </motion.div>
          )}
          
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="bg-gray-800/80 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50 text-center">
              <p className="text-3xl font-bold text-white">{user?.total_donated?.toFixed(2) || '0.00'}€</p>
              <p className="text-gray-400 text-sm mt-1">Deine Spenden</p>
            </div>
            <div className="bg-gray-800/80 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50 text-center">
              <p className="text-3xl font-bold text-white">{inviteInfo?.has_used ? 1 : 0}</p>
              <p className="text-gray-400 text-sm mt-1">Einladungen gesendet</p>
            </div>
            <div className="bg-gray-800/80 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50 text-center">
              <p className="text-3xl font-bold text-white">1</p>
              <p className="text-gray-400 text-sm mt-1">Einladungen verfügbar</p>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
