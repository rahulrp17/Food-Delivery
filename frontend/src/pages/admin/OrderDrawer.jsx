import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import { formatINR, formatDate } from '../../lib/format';
import {
  ADMIN_ORDER_TRANSITIONS,
  formatOrderStatus,
} from '../../lib/orders';
import { printOrderInvoice } from '../../lib/invoice';
import { getErrorMessage } from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import OrderStatusBadge, { PaymentStatusBadge } from '../../components/admin/StatusBadge';
import './OrderDrawer.css';

const getNextStatuses = (status) =>
  (ADMIN_ORDER_TRANSITIONS[status] || []).filter((next) => next !== 'cancelled');

export default function OrderDrawer({ orderId, onClose }) {
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const previousActive = useRef(null);
  const reduceMotion = useReducedMotion();

  const [notes, setNotes] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [savedNotes, setSavedNotes] = useState('');

  const {
    data,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.order(orderId),
    queryFn: () => adminApi.order(orderId),
    enabled: Boolean(orderId),
  });

  const { data: settingsData } = useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: () => adminApi.settings(),
    staleTime: 5 * 60 * 1000,
  });

  const order = data?.order;
  const serverOrderId = order?.id;
  const serverNotes = order?.adminNotes || '';

  useEffect(() => {
    if (serverOrderId) {
      setNotes(serverNotes);
      setSavedNotes(serverNotes);
    }
  }, [serverOrderId, serverNotes]);

  useEffect(() => {
    previousActive.current = document.activeElement;
    closeRef.current?.focus();
    document.body.classList.add('order-drawer-open');

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeInside = drawerRef.current.contains(document.activeElement);

      if (!activeInside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('order-drawer-open');
      if (previousActive.current instanceof HTMLElement) {
        previousActive.current.focus();
      }
    };
  }, [onClose]);

  const notesMutation = useMutation({
    mutationFn: (adminNotes) => adminApi.updateOrderNotes(orderId, adminNotes),
    onSuccess: (_, adminNotes) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.order(orderId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setSavedNotes(String(adminNotes || '').trim());
      showSuccess('Order notes saved');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to save order notes'));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, note }) => adminApi.updateOrderStatus(orderId, status, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.order(orderId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview() });
      setStatusNote('');
      showSuccess(`Order marked ${formatOrderStatus(variables.status)}`);
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to update order status'));
    },
  });

  const nextStatuses = order ? getNextStatuses(order.status) : [];
  const notesDirty = notes.trim() !== savedNotes.trim();
  const items = order?.items || [];
  const timeline = [...(order?.statusHistory || [])].reverse().slice(0, 6);

  const handleSaveNotes = () => {
    notesMutation.mutate(notes.trim());
  };

  const handleStatus = (status) => {
    statusMutation.mutate({ status, note: statusNote.trim() });
  };

  return createPortal(
    <div className="order-drawer-overlay" onClick={onClose}>
      <Motion.aside
        ref={drawerRef}
        className="order-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-drawer-title"
        aria-describedby="order-drawer-description"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        initial={reduceMotion ? false : { x: 32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <p id="order-drawer-description" className="visually-hidden">
          Quick view of an order with its customer, items, payment, status actions and internal
          notes.
        </p>
        <header className="order-drawer-header">
          <div className="order-drawer-heading">
            <span className="order-drawer-eyebrow">Order detail</span>
            <h2 id="order-drawer-title">
              {isPending ? 'Loading…' : order?.orderNumber || 'Order'}
            </h2>
            {order ? (
              <div className="order-drawer-badges">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
                <RefreshIndicator isFetching={isFetching} label="Refreshing" />
              </div>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="order-drawer-close"
            onClick={onClose}
            aria-label="Close order details"
          >
            <Icon name="x" size={18} label="" />
          </button>
        </header>

        <div className="order-drawer-body">
          {isPending ? (
            <div className="order-drawer-skeleton" aria-busy="true" aria-hidden="true">
              <div className="skeleton" style={{ height: '5rem' }} />
              <div className="skeleton" style={{ height: '9rem' }} />
              <div className="skeleton" style={{ height: '6rem' }} />
            </div>
          ) : error || !order ? (
            <div className="order-drawer-error" role="alert">
              <Icon name="alert-circle" size={32} />
              <p>We could not load this order.</p>
              <div className="order-drawer-error-actions">
                <Button variant="secondary" size="sm" onClick={() => refetch()}>
                  <Icon name="refresh" size={15} />
                  Try again
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              <section className="order-drawer-section">
                <div className="order-drawer-grid">
                  <div>
                    <h3>Customer</h3>
                    <p>{order.customer?.name || '—'}</p>
                    <p className="order-drawer-muted">{order.customer?.email || '—'}</p>
                    <p className="order-drawer-muted">{order.customer?.phone || '—'}</p>
                  </div>
                  <div>
                    <h3>Placed</h3>
                    <p>{formatDate(order.placedAt)}</p>
                    <p className="order-drawer-muted">
                      {items.length} item{items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="order-drawer-section">
                <h3>Delivery address</h3>
                <p>{order.addressSnapshot?.recipientName || '—'}</p>
                <p className="order-drawer-muted">
                  {[order.addressSnapshot?.line1, order.addressSnapshot?.line2]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
                <p className="order-drawer-muted">
                  {[order.addressSnapshot?.city, order.addressSnapshot?.state, order.addressSnapshot?.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </section>

              <section className="order-drawer-section">
                <h3>Items</h3>
                {items.length === 0 ? (
                  <p className="order-drawer-muted">This order has no items.</p>
                ) : (
                  <ul className="order-drawer-items">
                    {items.map((item, index) => (
                      <li key={`${item.productId || item.name}-${index}`}>
                        <span className="order-drawer-item-qty">{item.quantity}×</span>
                        <span className="order-drawer-item-name">{item.name}</span>
                        <span className="order-drawer-item-total">
                          {formatINR(item.lineTotalPaise)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="order-drawer-totals">
                  <div>
                    <span>Subtotal</span>
                    <span>{formatINR(order.pricing?.subtotalPaise)}</span>
                  </div>
                  {order.pricing?.discountPaise > 0 ? (
                    <div className="is-discount">
                      <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                      <span>-{formatINR(order.pricing.discountPaise)}</span>
                    </div>
                  ) : null}
                  <div>
                    <span>Delivery fee</span>
                    <span>{formatINR(order.pricing?.deliveryFeePaise)}</span>
                  </div>
                  <div>
                    <span>Tax</span>
                    <span>{formatINR(order.pricing?.taxPaise)}</span>
                  </div>
                  <div className="is-total">
                    <span>Total</span>
                    <span>{formatINR(order.pricing?.totalPaise)}</span>
                  </div>
                </div>
              </section>

              <section className="order-drawer-section">
                <h3>Payment</h3>
                <div className="order-drawer-grid">
                  <div>
                    <p className="order-drawer-muted">Status</p>
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>
                  <div>
                    <p className="order-drawer-muted">Method</p>
                    <p>{order.payment?.method || order.payment?.provider || '—'}</p>
                  </div>
                </div>
              </section>

              <section className="order-drawer-section">
                <h3>Update status</h3>
                <label htmlFor="drawer-status-note" className="order-drawer-muted">
                  Timeline note (optional)
                </label>
                <input
                  id="drawer-status-note"
                  type="text"
                  value={statusNote}
                  maxLength={300}
                  placeholder="e.g. packed for pickup"
                  onChange={(event) => setStatusNote(event.target.value)}
                />
                {nextStatuses.length > 0 ? (
                  <div className="order-drawer-status-actions">
                    {nextStatuses.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant="primary"
                        loading={statusMutation.isPending && statusMutation.variables?.status === status}
                        onClick={() => handleStatus(status)}
                      >
                        <Icon name="arrow-right" size={15} />
                        {formatOrderStatus(status)}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="order-drawer-muted">
                    No forward status change is available for this order.
                  </p>
                )}
              </section>

              <section className="order-drawer-section">
                <h3>Internal notes</h3>
                <p className="order-drawer-muted">
                  Visible to staff only. These notes are never shown to customers.
                </p>
                <textarea
                  id="drawer-admin-notes"
                  rows={4}
                  maxLength={1000}
                  value={notes}
                  placeholder="Allergies, delivery instructions, follow-up tasks…"
                  onChange={(event) => setNotes(event.target.value)}
                />
                <div className="order-drawer-notes-actions">
                  <span className="order-drawer-muted">{notes.length}/1000</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!notesDirty}
                    loading={notesMutation.isPending}
                    onClick={handleSaveNotes}
                  >
                    <Icon name="save" size={15} />
                    Save notes
                  </Button>
                </div>
                {savedNotes && !notesDirty ? (
                  <p className="order-drawer-muted">Notes are up to date.</p>
                ) : null}
              </section>

              <section className="order-drawer-section">
                <h3>Timeline</h3>
                {timeline.length === 0 ? (
                  <p className="order-drawer-muted">No status history recorded yet.</p>
                ) : (
                  <ol className="order-drawer-timeline">
                    {timeline.map((entry, index) => (
                      <li key={`${entry.status}-${index}`}>
                        <span className="order-drawer-timeline-dot" aria-hidden="true" />
                        <div>
                          <div className="order-drawer-timeline-head">
                            <strong>{formatOrderStatus(entry.status)}</strong>
                            <span className="order-drawer-muted">{formatDate(entry.at)}</span>
                          </div>
                          {entry.note ? (
                            <p className="order-drawer-muted">{entry.note}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>

        {order ? (
          <footer className="order-drawer-footer">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => printOrderInvoice(order, settingsData?.settings || {})}
              iconLeft={<Icon name="printer" size={15} />}
            >
              Print invoice
            </Button>
            <Button
              variant="primary"
              size="sm"
              to={`/admin/orders/${order.id}`}
              onClick={onClose}
              iconRight={<Icon name="arrow-right" size={15} label="" />}
            >
              Open full page
            </Button>
          </footer>
        ) : null}
      </Motion.aside>
    </div>,
    document.body
  );
}
