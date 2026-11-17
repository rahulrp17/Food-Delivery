import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const initialUser = {
  id: null,
  name: '',
  email: '',
  phone: '',
  role: 'user',
  emailVerified: false,
  createdAt: null,
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: initialUser,
      status: 'loading',
      hydrated: false,
      bootstrapped: false,

      setUser: (user) =>
        set({
          user: user ? { ...initialUser, ...user } : initialUser,
          status: user ? 'authenticated' : 'unauthenticated',
        }),

      setStatus: (status) => set({ status }),

      setHydrated: (hydrated) => set({ hydrated }),

      setBootstrapped: (bootstrapped) => set({ bootstrapped }),

      logout: () =>
        set({
          user: initialUser,
          status: 'unauthenticated',
        }),

      updateProfile: (updates) =>
        set((state) => ({
          user: { ...state.user, ...updates },
        })),

      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
      merge: (persisted, current) => ({ ...current, ...persisted, status: 'loading' }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    }
  )
);

export const selectUser = (state) => state.user;
export const selectAuthStatus = (state) => state.status;
export const selectIsAuthenticated = (state) => state.status === 'authenticated';
export const selectIsAdmin = (state) => state.user?.role === 'admin';