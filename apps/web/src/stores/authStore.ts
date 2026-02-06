import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  invite_code: string;
  has_used_invite: boolean;
  invited_by?: string;
  invited_user_id?: string;
  total_donated: number;
  is_admin: boolean;
  created_at: string;
}

interface InviteTree {
  user_id: string;
  email: string;
  invite_code: string;
  invited?: InviteTree;
  total_donated: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, inviteCode: string) => Promise<boolean>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  checkInviteCode: (code: string) => Promise<{ valid: boolean; inviter_email?: string }>;
  getMyInvite: () => Promise<{ invite_code: string; has_used: boolean; invited_user?: string } | null>;
  getInviteTree: () => Promise<InviteTree | null>;
  clearError: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Login fehlgeschlagen');
          }
          
          const data = await response.json();
          set({ token: data.access_token, isLoading: false });
          
          // Fetch user details
          await get().fetchMe();
          return true;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Login fehlgeschlagen', 
            isLoading: false 
          });
          return false;
        }
      },

      register: async (name: string, email: string, password: string, inviteCode: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/api/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, invite_code: inviteCode }),
          });
          
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Registrierung fehlgeschlagen');
          }
          
          const data = await response.json();
          set({ token: data.access_token, isLoading: false });
          
          // Fetch user details
          await get().fetchMe();
          return true;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Registrierung fehlgeschlagen', 
            isLoading: false 
          });
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
      },

      fetchMe: async () => {
        const token = get().token;
        if (!token) return;
        
        try {
          const response = await fetch(`${API_URL}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!response.ok) {
            if (response.status === 401) {
              set({ user: null, token: null });
            }
            return;
          }
          
          const user = await response.json();
          set({ user });
        } catch {
          // Network error - keep token, might work later
        }
      },

      checkInviteCode: async (code: string) => {
        try {
          const response = await fetch(`${API_URL}/api/users/invite/check/${code}`);
          if (!response.ok) {
            return { valid: false };
          }
          return await response.json();
        } catch {
          return { valid: false };
        }
      },

      getMyInvite: async () => {
        const token = get().token;
        if (!token) return null;
        
        try {
          const response = await fetch(`${API_URL}/api/users/invite/my`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!response.ok) return null;
          return await response.json();
        } catch {
          return null;
        }
      },

      getInviteTree: async () => {
        const token = get().token;
        if (!token) return null;
        
        try {
          const response = await fetch(`${API_URL}/api/users/invite/tree`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!response.ok) return null;
          return await response.json();
        } catch {
          return null;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
