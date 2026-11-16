import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, selectAuthStatus, selectIsAuthenticated, selectUser } from '../stores/auth.store';
import { useCartUiStore, selectGuestToken } from '../stores/cartUi.store';
import { useUiStore } from '../stores/ui.store';
import { authApi } from '../api/auth.api';
import { cartApi } from '../api/cart.api';
import { userApi } from '../api/user.api';

export function useAuth() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const status = useAuthStore(selectAuthStatus);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore(selectUser);
  const showSuccess = useUiStore((s) => s.success);
  const showError = useUiStore((s) => s.error);
  const guestToken = useCartUiStore(selectGuestToken);
  const mergeGuestCart = useCartUiStore((s) => s.mergeGuestCart);
  const setMerging = useCartUiStore((s) => s.setMerging);

  const bootstrap = useCallback(async () => {
    setStatus('loading');
    try {
      const { user } = await authApi.me();
      setUser(user);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, [setUser, setStatus]);

  const login = async (email, password) => {
    setStatus('loading');
    try {
      const { user } = await authApi.login({ email, password });
      setUser(user);
      setStatus('authenticated');

      if (guestToken) {
        setMerging(true);
        try {
          const cart = await cartApi.merge(guestToken);
          mergeGuestCart(cart.items || []);
        } catch {
          showError('Failed to merge guest cart');
        } finally {
          setMerging(false);
        }
      }

      showSuccess('Welcome back');
      return { success: true };
    } catch (e) {
      setStatus('unauthenticated');
      const message = e?.message || 'Login failed';
      showError(message);
      return { success: false, message, status: e?.status || 0, details: e?.details || null };
    }
  };

  const register = async (name, email, password) => {
    setStatus('loading');
    try {
      const { user } = await authApi.register({ name, email, password });
      setUser(user);
      setStatus('authenticated');

      if (guestToken) {
        setMerging(true);
        try {
          const cart = await cartApi.merge(guestToken);
          mergeGuestCart(cart.items || []);
        } catch {
          showError('Failed to merge guest cart');
        } finally {
          setMerging(false);
        }
      }

      showSuccess('Account created');
      return { success: true };
    } catch (e) {
      setStatus('unauthenticated');
      const message = e?.message || 'Registration failed';
      showError(message);
      return { success: false, message, status: e?.status || 0, details: e?.details || null };
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      showSuccess('Signed out');
      navigate('/login', { replace: true });
    }
  };

  const handleUpdateProfile = async (updates) => {
    try {
      const { user } = await userApi.updateProfile(updates);
      updateProfile(user);
      return { success: true };
    } catch (e) {
      const message = e?.message || 'Update failed';
      showError(message);
      return { success: false, message, status: e?.status || 0, details: e?.details || null };
    }
  };

  const handleUpdatePassword = async (currentPassword, newPassword) => {
    try {
      await authApi.updatePassword(currentPassword, newPassword);
      return { success: true };
    } catch (e) {
      const message = e?.message || 'Password update failed';
      showError(message);
      return { success: false, message, status: e?.status || 0, details: e?.details || null };
    }
  };

  /**
   * Exchanges the long-lived refresh cookie for a fresh access token.
   *
   * The access token only lasts 15 minutes, so the session is kept alive
   * proactively when the tab regains focus and lazily whenever a request
   * comes back with a 401.
   */
  const refreshSession = useCallback(async () => {
    try {
      await authApi.refresh();
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    user,
    status,
    isAuthenticated,
    isLoading: status === 'loading',
    login,
    register,
    logout: handleLogout,
    updateProfile: handleUpdateProfile,
    updatePassword: handleUpdatePassword,
    bootstrap,
    refreshSession,
  };
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  return { isAuthenticated, isLoading };
}