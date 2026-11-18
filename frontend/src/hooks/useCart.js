import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCartUiStore, selectGuestToken } from '../stores/cartUi.store';
import { useAuthStore } from '../stores/auth.store';
import { cartApi } from '../api/cart.api';
import { useUiStore } from '../stores/ui.store';

const CART_QUERY_KEY = ['cart'];

const recalcPricing = (items, previous) => {
  if (!previous) return previous;

  const subtotalPaise = items.reduce(
    (total, item) => total + (item.unitPricePaise || 0) * item.quantity,
    0
  );
  const discountPaise = Math.min(previous.discountPaise || 0, subtotalPaise);
  const taxableBasePaise = subtotalPaise - discountPaise;
  const taxPaise = Math.round((taxableBasePaise * (previous.taxRateBps || 0)) / 10000);
  let deliveryFeePaise = previous.deliveryFeePaise || 0;

  if (previous.freeDeliveryThresholdPaise) {
    if (taxableBasePaise >= previous.freeDeliveryThresholdPaise) {
      deliveryFeePaise = 0;
    } else if (deliveryFeePaise === 0) {
      deliveryFeePaise = 3900;
    }
  }

  return {
    ...previous,
    subtotalPaise,
    discountPaise,
    deliveryFeePaise,
    taxPaise,
    totalPaise: taxableBasePaise + taxPaise + deliveryFeePaise,
  };
};

const optimisticCart = (old, items) => ({
  ...old,
  items,
  itemCount: items.reduce((total, item) => total + item.quantity, 0),
  pricing: recalcPricing(items, old.pricing),
});

export function useCart() {
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((s) => s.success);
  const showError = useUiStore((s) => s.error);
  const guestToken = useCartUiStore(selectGuestToken);
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');
  const setItems = useCartUiStore((s) => s.setItems);
  const setCoupon = useCartUiStore((s) => s.setCoupon);
  const clearCoupon = useCartUiStore((s) => s.clearCoupon);
  // A signed-out visitor with no guest cart has nothing to fetch. Skipping the
  // call avoids a guaranteed 403 on first paint.
  const canLoadCart = Boolean(guestToken) || isAuthenticated;
  const { data: serverCart, isLoading, error, refetch } = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => cartApi.get(guestToken),
    enabled: canLoadCart,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (serverCart?.items) {
      setItems(serverCart.items);
    }
  }, [serverCart?.items, setItems]);

  useEffect(() => {
    if (serverCart?.coupon) {
      setCoupon(serverCart.coupon.code);
    } else {
      clearCoupon();
    }
  }, [serverCart?.coupon, setCoupon, clearCoupon]);

  const addItem = useMutation({
    mutationFn: ({ productId, quantity }) => cartApi.addItem(productId, quantity, guestToken),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = queryClient.getQueryData(CART_QUERY_KEY);
      queryClient.setQueryData(CART_QUERY_KEY, (old) => {
        if (!old) return old;
        const items = old.items || [];
        const existing = items.find((i) => i.productId === productId);
        if (existing) {
          return optimisticCart(
            old,
            items.map((i) =>
              i.productId === productId
                ? {
                    ...i,
                    quantity: i.quantity + quantity,
                    lineTotalPaise: (i.unitPricePaise || 0) * (i.quantity + quantity),
                  }
                : i
            )
          );
        }
        return optimisticCart(old, [...items, { productId, quantity }]);
      });
      return { previous };
    },
    onSuccess: () => showSuccess('Added to cart'),
    onError: (err, vars, context) => {
      if (context?.previous) queryClient.setQueryData(CART_QUERY_KEY, context.previous);
      showError(err?.message || 'Failed to add item');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });

  const updateQuantity = useMutation({
    mutationFn: ({ productId, quantity }) => cartApi.updateItem(productId, quantity, guestToken),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = queryClient.getQueryData(CART_QUERY_KEY);
      queryClient.setQueryData(CART_QUERY_KEY, (old) => {
        if (!old) return old;
        const items = old.items || [];
        const nextItems =
          quantity <= 0
            ? items.filter((i) => i.productId !== productId)
            : items.map((i) =>
                i.productId === productId
                  ? {
                      ...i,
                      quantity,
                      lineTotalPaise: (i.unitPricePaise || 0) * quantity,
                    }
                  : i
              );
        return optimisticCart(old, nextItems);
      });
      return { previous };
    },
    onError: (err, vars, context) => {
      if (context?.previous) queryClient.setQueryData(CART_QUERY_KEY, context.previous);
      showError(err?.message || 'Failed to update quantity');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });

  const removeItem = useMutation({
    mutationFn: (productId) => cartApi.removeItem(productId, guestToken),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = queryClient.getQueryData(CART_QUERY_KEY);
      queryClient.setQueryData(CART_QUERY_KEY, (old) => {
        if (!old) return old;
        return optimisticCart(
          old,
          (old.items || []).filter((i) => i.productId !== productId)
        );
      });
      return { previous };
    },
    onSuccess: () => showSuccess('Item removed from cart'),
    onError: (err, vars, context) => {
      if (context?.previous) queryClient.setQueryData(CART_QUERY_KEY, context.previous);
      showError(err?.message || 'Failed to remove item');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });

  const applyCoupon = useMutation({
    mutationFn: (code) => cartApi.applyCoupon(code, guestToken),
    onSuccess: (cart) => {
      if (cart?.coupon) showSuccess(`Coupon applied: ${cart.coupon.description || cart.coupon.code}`);
    },
    onError: (err) => {
      showError(err?.message || 'Invalid coupon');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });

  const removeCoupon = useMutation({
    mutationFn: () => cartApi.removeCoupon(guestToken),
    onSuccess: () => showSuccess('Coupon removed'),
    onError: (err) => showError(err?.message || 'Failed to remove coupon'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });

  const clear = useMutation({
    mutationFn: () => cartApi.clear(guestToken),
    onSuccess: () => showSuccess('Cart cleared'),
    onError: (err) => showError(err?.message || 'Failed to clear cart'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });

  const refresh = useCallback(() => refetch(), [refetch]);

  return {
    cart: serverCart,
    items: serverCart?.items || [],
    pricing: serverCart?.pricing,
    coupon: serverCart?.coupon,
    isLoading,
    error,
    addItem: (productId, quantity) => addItem.mutate({ productId, quantity }),
    updateQuantity: (productId, quantity) => updateQuantity.mutate({ productId, quantity }),
    removeItem: (productId) => removeItem.mutate(productId),
    applyCoupon: (code) => applyCoupon.mutate(code),
    removeCoupon: () => removeCoupon.mutate(),
    clear: () => clear.mutate(),
    refresh,
    isAdding: addItem.isPending,
    isUpdating: updateQuantity.isPending,
    updatingProductId: updateQuantity.variables?.productId,
    isRemoving: removeItem.isPending,
    isClearing: clear.isPending,
    isApplyingCoupon: applyCoupon.isPending,
  };
}