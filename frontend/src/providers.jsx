import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";
import { useAuthStore } from "./stores/auth.store";
import { setSessionExpiredHandler } from "./api/client";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          {children}
          <ToastContainer
            position="top-right"
            autoClose={2000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthProvider({ children }) {
  const { bootstrap, refreshSession } = useAuth();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // When a refresh fails the session is genuinely over — clear the signed-in
  // state rather than leaving a stale one behind.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      useAuthStore.getState().logout();
    });
  }, []);

  // The access token only lives 15 minutes. Refresh it when the tab comes
  // back to the foreground so the user is never bounced out mid-session.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && useAuthStore.getState().status === "authenticated") {
        refreshSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [refreshSession]);

  return children;
}

function CartProvider({ children }) {
  const { refresh } = useCart();
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");

  useEffect(() => {
    refresh();
  }, [refresh, isAuthenticated]);

  return children;
}
