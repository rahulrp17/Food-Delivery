import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateGuestToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export const useCartUiStore = create(
  persist(
    (set, get) => ({
      guestToken: null,
      items: [],
      couponCode: null,
      isMerging: false,

      initGuestToken: () => {
        const token = get().guestToken || generateGuestToken();
        if (!get().guestToken) set({ guestToken: token });
        return token;
      },

      setItems: (items) => set({ items }),

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.productId
                  ? { ...i, quantity: Math.min(i.quantity + (product.quantity || 1), i.maxQuantity || 99) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...product, quantity: product.quantity || 1 }] };
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity: Math.min(quantity, i.maxQuantity || 99) } : i
                ),
        })),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      clear: () => set({ items: [], couponCode: null }),

      setCoupon: (code) => set({ couponCode: code }),
      clearCoupon: () => set({ couponCode: null }),

      setMerging: (isMerging) => set({ isMerging }),

      mergeGuestCart: (serverItems) =>
        set((state) => {
          const merged = [...serverItems];
          for (const guestItem of state.items) {
            const existing = merged.find((i) => i.productId === guestItem.productId);
            if (existing) {
              existing.quantity = Math.min(existing.quantity + guestItem.quantity, existing.maxQuantity || 99);
            } else {
              merged.push(guestItem);
            }
          }
          return { items: merged, guestToken: null };
        }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getSubtotal: () => get().items.reduce((sum, i) => sum + i.unitPricePaise * i.quantity, 0),
    }),
    {
      name: 'cart-ui-storage',
      partialize: (state) => ({
        guestToken: state.guestToken,
        items: state.items,
        couponCode: state.couponCode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.initGuestToken();
      },
    }
  )
);

export const selectCartItems = (state) => state.items;
export const selectGuestToken = (state) => state.guestToken;
export const selectCouponCode = (state) => state.couponCode;
export const selectItemCount = (state) => state.getItemCount();
export const selectSubtotal = (state) => state.getSubtotal();