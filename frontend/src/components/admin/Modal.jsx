import { useEffect, useRef, useCallback, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'motion/react';
import '../../styles/admin-buttons.css';
import './Modal.css';

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showClose = true,
  closeOnOverlay = true,
  closeOnEscape = true,
  footer,
}) {
  const previousActive = useRef(null);
  const modalRef = useRef(null);
  const firstFocusable = useRef(null);
  const lastFocusable = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = useReducedMotion();

  const trapFocus = useCallback((e) => {
    if (e.key !== 'Tab' || !modalRef.current) return;
    const focusable = Array.from(
      modalRef.current.querySelectorAll(focusableSelector)
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    firstFocusable.current = focusable[0];
    lastFocusable.current = focusable[focusable.length - 1];

    const activeInside = modalRef.current.contains(document.activeElement);
    const atContainer = document.activeElement === modalRef.current;

    if (atContainer || !activeInside) {
      e.preventDefault();
      (e.shiftKey ? lastFocusable.current : firstFocusable.current)?.focus();
    } else if (e.shiftKey && document.activeElement === firstFocusable.current) {
      e.preventDefault();
      lastFocusable.current?.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable.current) {
      e.preventDefault();
      firstFocusable.current?.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        if (!onClose) return;
        e.preventDefault();
        onClose();
      } else {
        trapFocus(e);
      }
    },
    [closeOnEscape, onClose, trapFocus]
  );

  useEffect(() => {
    if (isOpen) {
      previousActive.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => modalRef.current?.focus(), 0);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
        previousActive.current?.focus();
      };
    }
  }, [isOpen, handleKeyDown]);

  const modalContent = (
    <Motion.div
      key="modal-overlay"
      className="modal-overlay"
      onClick={closeOnOverlay ? onClose : undefined}
      role="presentation"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <Motion.div
        ref={modalRef}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {(title || showClose) && (
          <header className="modal-header">
            <div className="modal-heading">
              {title ? <h2 id={titleId} className="modal-title">{title}</h2> : null}
              {description ? (
                <p id={descriptionId} className="modal-description">{description}</p>
              ) : null}
            </div>
            {showClose && (
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </header>
        )}
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </Motion.div>
    </Motion.div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(
      <AnimatePresence>{isOpen ? modalContent : null}</AnimatePresence>,
      document.body
    );
  }

  return null;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  const [isPending, setIsPending] = useState(false);
  const busy = loading || isPending;

  const handleConfirm = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      const result = onConfirm ? await onConfirm() : undefined;
      if (result !== false) onClose();
    } catch {
      // The caller surfaces the error; keep the dialog open.
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      title={title}
      size="sm"
      showClose={!busy}
      footer={
        <div className="confirm-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn-${variant}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? '…' : confirmText}
          </button>
        </div>
      }
    >
      {message ? <p className="confirm-message">{message}</p> : null}
      {children}
    </Modal>
  );
}

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  children,
  submitText = 'Save',
  cancelText = 'Cancel',
  loading = false,
  size = 'lg',
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = loading || isSubmitting;
  const formId = useId();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = onSubmit ? await onSubmit(e) : undefined;
      if (result !== false) onClose();
    } catch {
      // The caller surfaces the error; keep the dialog open.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      title={title}
      description={description}
      size={size}
      showClose={!busy}
      footer={
        <div className="form-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : submitText}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="modal-form" noValidate>
        <div className="modal-form-content">{children}</div>
      </form>
    </Modal>
  );
}

export default Modal;
