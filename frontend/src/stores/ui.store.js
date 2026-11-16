import { create } from 'zustand';
import { toast } from 'react-toastify';

const normalizeOptions = (options = {}) => {
  const { duration, ...rest } = options;
  if (duration === undefined) return rest;
  return { ...rest, autoClose: duration === 0 ? false : duration };
};

const notify = (type, defaultDuration) => (message, options) =>
  toast[type](message, { autoClose: defaultDuration, ...normalizeOptions(options) });

export const useUiStore = create((set) => ({
  modals: {},

  success: notify('success', 4000),
  error: notify('error', 6000),
  info: notify('info', 4000),
  warning: notify('warning', 5000),

  openModal: (key, props = {}) =>
    set((state) => ({ modals: { ...state.modals, [key]: { open: true, props } } })),

  closeModal: (key) =>
    set((state) => {
      const next = { ...state.modals };
      delete next[key];
      return { modals: next };
    }),
}));

export const selectModal = (key) => (state) => state.modals[key]?.open;
export const selectModalProps = (key) => (state) => state.modals[key]?.props;
