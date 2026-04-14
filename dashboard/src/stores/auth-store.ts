import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: '',
      isAuthenticated: false,
      login: (token: string) => set({ token, isAuthenticated: true }),
      logout: () => set({ token: '', isAuthenticated: false }),
    }),
    { name: 'wa-convo-auth' },
  ),
);
