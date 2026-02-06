import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

interface AdminUser {
  id: string;
  email: string;
  invite_code: string;
  has_used_invite: boolean;
  invited_by?: string;
  total_donated: number;
  is_admin: boolean;
  created_at: string;
}

interface AdminStats {
  total_users: number;
  total_donations: number;
  unused_invites: number;
  used_invites: number;
}

interface InviteTree {
  user_id: string;
  email: string;
  invite_code: string;
  invited?: InviteTree;
  total_donated: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function AdminPage() {
  const navigate = useNavigate();
  const { user, token, fetchMe } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tree, setTree] = useState<InviteTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'tree' | 'stats'>('users');
  
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    const loadData = async () => {
      await fetchMe();
    };
    
    loadData();
  }, [token, navigate, fetchMe]);
  
  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/invite');
    }
    
    if (user?.is_admin && token) {
      loadAdminData();
    }
  }, [user, token, navigate]);
  
  const loadAdminData = async () => {
    try {
      const [usersRes, statsRes, treeRes] = await Promise.all([
        fetch(`${API_URL}/api/users/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/users/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/users/admin/tree`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (treeRes.ok) setTree(await treeRes.json());
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Flatten tree for counting
  const countTreeNodes = (node: InviteTree | null): number => {
    if (!node) return 0;
    return 1 + countTreeNodes(node.invited || null);
  };
  
  // Render tree recursively with visual connections
  const renderTree = (node: InviteTree, depth = 0): React.ReactNode => {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.05 }}
        key={node.user_id}
        className="relative"
      >
        {depth > 0 && (
          <div className="absolute left-0 top-0 w-6 h-6 border-l-2 border-b-2 border-purple-500/30 rounded-bl-lg -translate-x-3" />
        )}
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/30 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {node.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{node.email}</p>
            <p className="text-gray-500 text-xs font-mono">{node.invite_code}</p>
          </div>
          {node.total_donated > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30">
              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="text-yellow-400 text-xs font-medium">
                {node.total_donated.toFixed(2)}€
              </span>
            </div>
          )}
        </div>
        
        {node.invited && (
          <div className="ml-6 mt-2 pl-3 border-l-2 border-purple-500/20">
            {renderTree(node.invited, depth + 1)}
          </div>
        )}
      </motion.div>
    );
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      
      {/* Header */}
      <header className="relative z-10 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div>
              <span className="text-white font-semibold text-lg">Infinite Canvas</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                Admin
              </span>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link
              to="/canvas"
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Zum Canvas
            </Link>
            <Link
              to="/invite"
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Meine Einladung
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">Übersicht aller Nutzer und Spenden</p>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/80 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm">Nutzer gesamt</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.total_users}</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800/80 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm">Spenden gesamt</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.total_donations.toFixed(2)}€</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800/80 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm">Verwendete Einladungen</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.used_invites}</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800/80 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm">Offene Einladungen</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.unused_invites}</p>
            </motion.div>
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['users', 'tree', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'users' && 'Alle Nutzer'}
              {tab === 'tree' && 'Einladungsbaum'}
              {tab === 'stats' && 'Spendenübersicht'}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Nutzer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Einladungscode
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Eingeladen von
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Spenden
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Registriert
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {users.map((u) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-700/20 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {u.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{u.email}</p>
                            {u.is_admin && (
                              <span className="text-xs text-red-400">Admin</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-gray-400 font-mono text-sm">{u.invite_code}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-400">
                          {u.invited_by ? users.find((x) => x.id === u.invited_by)?.email || u.invited_by : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.has_used_invite ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                            Einladung verwendet
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                            Einladung offen
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {u.total_donated > 0 ? (
                          <span className="text-yellow-400 font-medium">
                            {u.total_donated.toFixed(2)}€
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                        {new Date(u.created_at).toLocaleDateString('de-DE')}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {activeTab === 'tree' && tree && (
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2 text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">
                  Zeigt die Einladungskette: Wer hat wen eingeladen?
                </span>
              </div>
              <div className="space-y-4">
                {renderTree(tree)}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-700 text-center text-gray-400">
                <span className="text-2xl font-bold text-white">{countTreeNodes(tree)}</span>
                <span className="ml-2">Nutzer in der Kette</span>
              </div>
            </div>
          )}
          
          {activeTab === 'stats' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Top Spender</h3>
              <div className="space-y-3">
                {users
                  .filter((u) => u.total_donated > 0)
                  .sort((a, b) => b.total_donated - a.total_donated)
                  .map((u, index) => (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-700/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span className="text-xl font-bold text-yellow-400">
                          {u.total_donated.toFixed(2)}€
                        </span>
                      </div>
                    </motion.div>
                  ))}
                {users.filter((u) => u.total_donated > 0).length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Noch keine Spenden eingegangen</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
