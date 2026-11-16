import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import { formatINR, formatDate } from '../../lib/format';
import {
  ORDER_PROGRESS_STEPS,
  ADMIN_ORDER_TRANSITIONS as ADMIN_TRANSITIONS,
  formatOrderStatus as formatStatus,
} from '../../lib/orders';
import { printOrderInvoice } from '../../lib/invoice';
import {
  cancelOrderFormSchema,
  getErrorMessage,
  parseForm,
} from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { FormSkeleton, TableSkeleton } from '../../components/loading';
import OrderStatusBadge, { PaymentStatusBadge } from '../../components/admin/StatusBadge';
import { ConfirmDialog } from '../../components/admin/Modal';
import './OrderDetailPage.css';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const reduceMotion = useReducedMotion();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useDocumentTitle('Order Detail');

  const {
    data,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.order(id),
    queryFn: () => adminApi.order(id),
    enabled: !!id,
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
    if (serverOrderId) setAdminNotes(serverNotes);
  }, [serverOrderId, serverNotes]);

  const notesMutation = useMutation({
    mutationFn: (notes) => adminApi.updateOrderNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.order(id) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      showSuccess('Order notes saved');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to save order notes'));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, note }) => adminApi.updateOrderStatus(orderId, status, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.order(id) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview() });
      setStatusDialogOpen(false);
      showSuccess(`Order marked ${formatStatus(variables.status)}`);
      setPendingStatus('');
      setStatusNote('');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to update order status'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }) => adminApi.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.order(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders({}) });
      setCancelDialogOpen(false);
      setCancelReason('');
      setCancelError('');
      showSuccess('Order cancelled');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to cancel order'));
    },
  });

  const allowedTransitions = order?.status ? ADMIN_TRANSITIONS[order.status] || [] : [];
  const statusTransitions = allowedTransitions.filter((status) => status !== 'cancelled');
  const canCancel = allowedTransitions.includes('cancelled');
  const savedNotes = order?.adminNotes || '';
  const notesDirty = adminNotes.trim() !== savedNotes.trim();

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'cancelled') {
      handleCancel();
      return;
    }

    setPendingStatus(newStatus);
    setStatusNote('');
    setStatusDialogOpen(true);
  };

  const handleCancel = () => {
    setCancelError('');
    setCancelDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return false;
    await updateStatusMutation.mutateAsync({
      orderId: id,
      status: pendingStatus,
      note: statusNote.trim(),
    });
  };

  const confirmCancel = async () => {
    const parsed = parseForm(cancelOrderFormSchema, { reason: cancelReason });
    if (!parsed.success) {
      setCancelError(parsed.errors.reason);
      return false;
    }

    setCancelError('');
    await cancelMutation.mutateAsync({ orderId: id, reason: parsed.data.reason });
  };

  if (isPending) {
    return (
      <div className="admin-order-detail-page">
        <div className="detail-skeleton" aria-busy="true">
          <FormSkeleton fields={6} rows={2} />
          <TableSkeleton rows={3} columns={4} />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="admin-order-detail-page">
        <div className="detail-error-panel">
          <ErrorState
            title="Order not found"
            description={
              error
                ? getErrorMessage(error, 'We could not load this order. Please try again.')
                : 'This order may have been removed, or the link is out of date.'
            }
            onRetry={() => refetch()}
          />
          <Button variant="secondary" onClick={() => navigate('/admin/orders')}>
            <Icon name="arrow-left" size={16} />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  const o = order;
  const pricing = o.pricing || {};
  const address = o.addressSnapshot || {};
  const items = o.items || [];

  const timeline = [...(o.statusHistory || [])].reverse();
  const progressIndex = ORDER_PROGRESS_STEPS.findIndex((step) => step.key === o.status);
  const isExceptionStatus = progressIndex === -1;

  return (
    <div className="admin-order-detail-page">
      <header className="detail-header">
        <div className="detail-header-identity">
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/orders')}>
            <Icon name="arrow-left" size={16} />
            Back to Orders
          </Button>
          <h1>
            Order <span className="order-number">{o.orderNumber}</span>
          </h1>
          <p className="detail-header-meta">
            Placed {formatDate(o.placedAt)} · {items.length} item{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="detail-header-actions">
          <OrderStatusBadge status={o.status} />
          <PaymentStatusBadge status={o.paymentStatus} />
          <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing order" />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => printOrderInvoice(o, settingsData?.settings || {})}
          >
            <Icon name="printer" size={16} />
            Print invoice
          </Button>
        </div>
      </header>

      <div className="detail-grid" aria-busy={isFetching || undefined}>
        <section className="detail-card">
          <h2>Customer</h2>
          <div className="detail-row"><strong>Name:</strong> <span>{o.customer?.name || '—'}</span></div>
          <div className="detail-row"><strong>Email:</strong> <span>{o.customer?.email || '—'}</span></div>
          <div className="detail-row"><strong>Phone:</strong> <span>{o.customer?.phone || '—'}</span></div>
        </section>

        <section className="detail-card">
          <h2>Delivery Address</h2>
          <div className="detail-row"><strong>Name:</strong> <span>{address.recipientName || '—'}</span></div>
          <div className="detail-row"><strong>Phone:</strong> <span>{address.phone || '—'}</span></div>
          <div className="detail-row"><strong>Address:</strong> <span>{address.line1 || ''} {address.line2 ? `, ${address.line2}` : ''}</span></div>
          <div className="detail-row"><strong>City:</strong> <span>{address.city || '—'}</span></div>
          <div className="detail-row"><strong>State:</strong> <span>{address.state || '—'}</span></div>
          <div className="detail-row"><strong>Pincode:</strong> <span>{address.pincode || '—'}</span></div>
        </section>

        <section className="detail-card detail-card-full order-progress-card">
          <div className="detail-section-heading">
            <div>
              <h2>Order progress</h2>
              <p>Track this order from placement through delivery.</p>
            </div>
            {!isExceptionStatus && (
              <span className="progress-caption">
                Step {progressIndex + 1} of {ORDER_PROGRESS_STEPS.length}
              </span>
            )}
          </div>

          {isExceptionStatus ? (
            <div className="status-exception-note">
              <OrderStatusBadge status={o.status} />
              <p>This order left the normal delivery flow and no further progress steps apply.</p>
            </div>
          ) : (
            <ol className="order-progress">
              {ORDER_PROGRESS_STEPS.map((step, index) => {
                const state =
                  index < progressIndex
                    ? 'is-complete'
                    : index === progressIndex
                      ? 'is-current'
                      : 'is-upcoming';

                return (
                  <li key={step.key} className={`order-progress-step ${state}`}>
                    <span className="order-progress-marker" aria-hidden="true">
                      {index < progressIndex ? (
                        <Icon name="check" size={13} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="order-progress-label">{step.label}</span>
                    {index === progressIndex ? (
                      <span className="order-progress-current">Current</span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="detail-card detail-card-full">
          <div className="detail-section-heading">
            <div>
              <h2>Items ({items.length})</h2>
              <p>Everything the customer ordered, with the price that was charged.</p>
            </div>
          </div>
          {items.length === 0 ? (
            <EmptyState
              icon="package"
              title="This order has no items"
              description="The item list is empty, so there is nothing to prepare or charge."
            />
          ) : (
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div className="item-info">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt=""
                            width={40}
                            height={40}
                            loading="lazy"
                            decoding="async"
                            style={{
                              borderRadius: 'var(--radius-sm)',
                              objectFit: 'cover',
                            }}
                          />
                        )}
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(item.unitPricePaise)}</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(item.lineTotalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="detail-card detail-card-full">
          <h2>Pricing</h2>
          <div className="pricing-breakdown">
            <div className="pricing-row"><span>Subtotal</span><span>{formatINR(pricing.subtotalPaise)}</span></div>
            {pricing.discountPaise > 0 && <div className="pricing-row discount"><span>Discount ({o.couponCode || 'coupon'})</span><span>-{formatINR(pricing.discountPaise)}</span></div>}
            <div className="pricing-row"><span>Delivery Fee</span><span>{formatINR(pricing.deliveryFeePaise)}</span></div>
            <div className="pricing-row"><span>Tax ({pricing.taxRateBps ? (pricing.taxRateBps / 100).toFixed(1) : '0'}%)</span><span>{formatINR(pricing.taxPaise)}</span></div>
            <div className="pricing-row total"><span>Total</span><span>{formatINR(pricing.totalPaise)}</span></div>
          </div>
        </section>

        <section className="detail-card detail-card-full">
          <h2>Payment</h2>
          <div className="payment-grid">
            <div className="payment-cell">
              <span>Status</span>
              <PaymentStatusBadge status={o.paymentStatus} />
            </div>
            <div className="payment-cell">
              <span>Method</span>
              <strong>{o.payment?.method || o.payment?.provider || '—'}</strong>
            </div>
            <div className="payment-cell">
              <span>Reference</span>
              <strong className="payment-reference">{o.payment?.reference || o.payment?.id || '—'}</strong>
            </div>
          </div>
        </section>

        <section className="detail-card detail-card-full">
          <div className="detail-section-heading">
            <div>
              <h2>Status History</h2>
              <p>Every status this order has been through, newest first.</p>
            </div>
          </div>
          {timeline.length === 0 ? (
            <EmptyState
              icon="clock"
              title="No status history yet"
              description="Nothing has changed on this order since it was created."
            />
          ) : (
            <div className="timeline">
              {timeline.map((entry, i) => (
                <Motion.div
                  key={`${entry.status}-${i}`}
                  className="timeline-item"
                  initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.2,
                    delay: reduceMotion ? 0 : Math.min(i, 6) * 0.03,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <div className={`timeline-marker${i === 0 ? ' is-current' : ''}`} />
                  <div className="timeline-content">
                    <div className="timeline-status">
                      <OrderStatusBadge status={entry.status} />
                      <span className="timeline-time">{formatDate(entry.at)}</span>
                    </div>
                    {entry.byUserId && (
                      <div className="timeline-by">
                        Updated by {entry.byUserName || 'staff'}
                      </div>
                    )}
                    {entry.note && <div className="timeline-note">{entry.note}</div>}
                  </div>
                </Motion.div>
              ))}
            </div>
          )}
        </section>

        <section className="detail-card detail-card-full">
          <h2>Actions</h2>
          <div className="actions-grid">
            <div className="action-group">
              <h3>Change status</h3>
              {statusTransitions.length > 0 ? (
                <>
                  <p className="action-hint">
                    Move this order to the next valid status. Add a note for the timeline.
                  </p>
                  <div className="status-buttons">
                    {statusTransitions.map((status) => (
                      <Button
                        key={status}
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusChange(status)}
                      >
                        <Icon name="arrow-right" size={16} />
                        {formatStatus(status)}
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="action-hint">No forward status change is available.</p>
              )}
            </div>
            {canCancel ? (
              <div className="action-group">
                <h3>Cancel order</h3>
                <p className="action-hint">
                  Cancelling restocks items and records the reason in the timeline.
                </p>
                <Button variant="danger" size="sm" onClick={handleCancel}>
                  <Icon name="x" size={16} />
                  Cancel Order
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="detail-card detail-card-full">
          <div className="detail-section-heading">
            <div>
              <h2>Internal notes</h2>
              <p>Visible to staff only — never shown to customers.</p>
            </div>
            <Icon name="note" size={20} label="" />
          </div>
          <label htmlFor="admin-notes" className="visually-hidden">
            Internal order notes
          </label>
          <textarea
            id="admin-notes"
            className="modal-form-input admin-notes-input"
            rows={4}
            maxLength={1000}
            value={adminNotes}
            placeholder="Allergies, delivery instructions, follow-up tasks…"
            onChange={(event) => setAdminNotes(event.target.value)}
          />
          <div className="admin-notes-footer">
            <span className="action-hint">{adminNotes.length}/1000 characters</span>
            <Button
              size="sm"
              variant="secondary"
              disabled={!notesDirty}
              loading={notesMutation.isPending}
              onClick={() => notesMutation.mutate(adminNotes.trim())}
            >
              <Icon name="save" size={16} />
              Save notes
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={statusDialogOpen}
        onClose={() => {
          setStatusDialogOpen(false);
          setStatusNote('');
        }}
        onConfirm={confirmStatusChange}
        title="Change Order Status"
        message={`Move this order from "${formatStatus(o.status)}" to "${formatStatus(pendingStatus)}"?`}
        confirmText="Yes, change status"
        variant="primary"
        loading={updateStatusMutation.isPending}
      >
        <label className="status-note-label" htmlFor="status-note">
          Status note <span>(optional)</span>
        </label>
        <textarea
          id="status-note"
          value={statusNote}
          onChange={(event) => setStatusNote(event.target.value)}
          placeholder="e.g. packed for pickup, customer requested delay..."
          rows={3}
          maxLength={300}
          className="modal-form-input"
        />
        <p className="status-note-hint">This note appears in the order timeline.</p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => { setCancelDialogOpen(false); setCancelReason(''); setCancelError(''); }}
        onConfirm={confirmCancel}
        title="Cancel Order"
        message="This will cancel the order and restock items. Please provide a reason."
        confirmText="Cancel Order"
        variant="danger"
        loading={cancelMutation.isPending}
      >
        <textarea
          value={cancelReason}
          onChange={(e) => {
            setCancelReason(e.target.value);
            if (cancelError) setCancelError('');
          }}
          placeholder="Reason for cancellation..."
          rows={3}
          className={`modal-form-input ${cancelError ? 'has-error' : ''}`.trim()}
          aria-invalid={cancelError ? 'true' : undefined}
          required
        />
        {cancelError ? <p className="field-error" role="alert">{cancelError}</p> : null}
      </ConfirmDialog>
    </div>
  );
}
