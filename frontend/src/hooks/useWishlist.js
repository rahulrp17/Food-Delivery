import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import { selectIsAuthenticated, useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';

const WISHLIST_KEY = ['wishlist'];

/**
 * The signed-in customer's saved dishes. The query is disabled for guests, so
 * a product card never fires a 401 just to render its heart.
 *
 * Writes are optimistic (the heart fills immediately) and roll back on error;
 * the list is invalidated afterwards so the account page stays in step.
 */
export function useWishlist() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const showSuccess = useUiStore((s) => s.success);
  const showError = useUiStore((s) => s.error);
  const queryClient = useQueryClient();

  const wishlist = useQuery({
    queryKey: WISHLIST_KEY,
    queryFn: () => userApi.listWishlist(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const items = wishlist.data?.items || [];

  const add = useMutation({
    mutationFn: (product) => userApi.addToWishlist(product.id),
    onMutate: async (product) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_KEY });
      const previous = queryClient.getQueryData(WISHLIST_KEY);
      queryClient.setQueryData(WISHLIST_KEY, (old) => {
        const current = old?.items || [];
        if (current.some((entry) => entry.id === product.id)) return old;
        return { ...(old || {}), items: [product, ...current] };
      });
      return { previous };
    },
    onSuccess: () => showSuccess('Saved to your wishlist'),
    onError: (error, _product, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(WISHLIST_KEY, context.previous);
      }
      showError(error?.message || 'Could not save this dish');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: WISHLIST_KEY }),
  });

  const remove = useMutation({
    mutationFn: (product) => userApi.removeFromWishlist(product.id),
    onMutate: async (product) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_KEY });
      const previous = queryClient.getQueryData(WISHLIST_KEY);
      queryClient.setQueryData(WISHLIST_KEY, (old) => ({
        ...(old || {}),
        items: (old?.items || []).filter((entry) => entry.id !== product.id),
      }));
      return { previous };
    },
    onSuccess: () => showSuccess('Removed from your wishlist'),
    onError: (error, _product, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(WISHLIST_KEY, context.previous);
      }
      showError(error?.message || 'Could not update your wishlist');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: WISHLIST_KEY }),
  });

  const isWishlisted = (productId) =>
    items.some((entry) => entry.id === productId);

  const isPendingFor = (productId) =>
    (add.isPending && add.variables?.id === productId) ||
    (remove.isPending && remove.variables?.id === productId);

  /**
   * Returns `"auth"` for guests so the card can route them to sign-in, and
   * `"toggled"` otherwise.
   */
  const toggle = (product) => {
    if (!isAuthenticated) {
      showError('Sign in to save dishes to your wishlist');
      return 'auth';
    }

    if (isWishlisted(product.id)) {
      remove.mutate(product);
    } else {
      add.mutate(product);
    }

    return 'toggled';
  };

  return { isAuthenticated, isWishlisted, isPendingFor, toggle };
}
