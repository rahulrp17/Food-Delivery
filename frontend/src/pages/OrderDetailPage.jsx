import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders.api';
import { formatINR, formatDate } from '../lib/format';
import {
  ORDER_PROGRESS_STEPS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
  isActiveOrder,
  isCancellableOrder,
} from '../lib/orders';
import {
  cancelOrderFormSchema,
  focusFirstInvalidField,
  getErrorMessage,
  parseForm,
} from '../lib/validation/forms';
import { useUiStore } from '../stores/ui.store';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Icon from '../components/ui/Icon';
import SafeImage from '../components/ui/SafeImage';
import { resolveOrderImage } from '../lib/orderImages';
import './OrderDetailPage.css';

/** Statuses that end an order outside the normal delivery path. */
const EXCEPTION_ORDER_STATUSES = new Set(["cancelled", "payment_failed", "refunded"]);

/** What is happening to the order right now, for every status. */
const NEXT_STEP = {
  pending_payment: {
    icon: 'ticket',
    title: 'Waiting for your payment',
    note: 'Complete the payment and the kitchen will start on your order.',
  },
  confirmed: {
    icon: 'check',
    title: 'The kitchen has your order',
    note: 'Everything is confirmed — your dishes are next in the queue.',
  },
  preparing: {
    icon: 'chef-hat',
    title: 'Being cooked right now',
    note: 'Your food is on the pass and will be packed the moment it is ready.',
  },
  out_for_delivery: {
    icon: 'truck',
    title: 'On the way to you',
    note: 'A rider is on the way with your sealed bag.',
  },
  delivered: {
    icon: 'package',
    title: 'Delivered',
    note: 'We hope it hit the spot. Rate the dishes if you have a minute.',
  },
  cancelled: {
    icon: 'x-circle',
    title: 'Cancelled',
    note: 'This order will not be delivered.',
  },
  refunded: {
    icon: 'refresh',
    title: 'Refunded',
    note: 'The payment has been returned to your method.',
  },
};

export default function OrderDetailPage() {
  const reduceMotion = useReducedMotion();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelErrors, setCancelErrors] = useState({});
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await ordersApi.get(id);
      setOrder(res.order);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Unable to load order details'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleReorder = async () => {
    setIsReordering(true);
    setActionError(null);
    try {
      await ordersApi.reorder(id);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      showSuccess('Items added back to your cart');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to reorder items');
      setActionError(message);
      showError(message);
    } finally {
      setIsReordering(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseForm(cancelOrderFormSchema, { reason: cancelReason });
    if (!parsed.success) {
      setCancelErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }

    setIsCancelling(true);
    setActionError(null);
    try {
      await ordersApi.cancel(id, parsed.data.reason);
      setShowCancelForm(false);
      setCancelReason('');
      setCancelErrors({});
      showSuccess('Order cancelled');
      await loadOrder();
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to cancel order');
      setActionError(message);
      showError(message);
    } finally {
      setIsCancelling(false);
    }
  };

  const closeCancelForm = () => {
    setShowCancelForm(false);
    setCancelReason('');
    setCancelErrors({});
  };

  // The first time each status was reached — this is what actually wires the
  // timeline to the order rather than guessing from the current status.
  const reachedAt = useMemo(() => {
    const map = new Map();
    for (const entry of order?.statusHistory || []) {
      if (!map.has(entry.status)) map.set(entry.status, entry.at);
    }
    return map;
  }, [order?.statusHistory]);

  if (isLoading) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-skeleton">
          <div className="skeleton-header">
            <div className="skeleton" style={{ width: 220, height: 30 }} />
            <div className="skeleton" style={{ width: 120, height: 30 }} />
          </div>
          <div className="skeleton" style={{ width: '100%', height: 180 }} />
          <div className="skeleton" style={{ width: '100%', height: 150 }} />
        </div>
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="order-detail-page">
        <EmptyState
          icon="alert-triangle"
          headingLevel="h1"
          title="Unable to load this order"
          description={loadError || 'Order details could not be found.'}
          actions={
            <>
              <Button variant="outline" onClick={loadOrder} iconLeft={<Icon name="refresh" size={16} />}>
                Try again
              </Button>
              <Button to="/orders" variant="ghost">Back to orders</Button>
            </>
          }
        />
      </div>
    );
  }

  const currentStatusIndex = ORDER_PROGRESS_STEPS.findIndex((step) => step.key === order.status);
  const active = isActiveOrder(order.status);
  const itemCount = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  const isException = EXCEPTION_ORDER_STATUSES.has(order.status);
  const isComplete = order.status === 'delivered';

  const stepState = (step, index) => {
    if (isException) return reachedAt.has(step.key) ? 'done' : 'skipped';
    if (isComplete) return 'done';
    if (index < currentStatusIndex) return 'done';
    if (index === currentStatusIndex) return 'current';
    return 'upcoming';
  };

  return (
    <motion.div
      className="order-detail-page"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.2 : 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to="/orders" className="back-link">
        <Icon name="arrow-left" size={17} />
        Back to orders
      </Link>

      <header className="order-header">
        <div className="header-main">
          <div className="order-identity">
            <span className="eyebrow">Order details</span>
            <h1>Order #{order.id.slice(-8).toUpperCase()}</h1>
            <span className="order-date">Placed {formatDate(order.placedAt)}</span>
          </div>
          <div className="header-status">
            <Badge
              tone={ORDER_STATUS_VARIANTS[order.status] || 'neutral'}
              data-testid="order-status"
            >
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </Badge>
            {active ? (
              <span className="header-live">
                <span className="header-live-dot" aria-hidden="true" />
                Live
              </span>
            ) : null}
          </div>
        </div>

        {/* The timeline is always shown. An order that has been delivered
            shows every step completed, and one that was cancelled shows
            exactly how far it got before it stopped. */}
        <nav className="order-progress" aria-label="Order progress">
          <ol className="progress-steps">
            {ORDER_PROGRESS_STEPS.map((step, index) => {
              const state = stepState(step, index);
              const at = reachedAt.get(step.key);

              return (
                <li
                  key={step.key}
                  className={`progress-step is-${state}`}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  <span className="step-marker" aria-hidden="true">
                    {state === 'done' ? (
                      <Icon name="check" size={13} strokeWidth={3} />
                    ) : null}
                    {state === 'current' ? <span className="pulse-ring" /> : null}
                  </span>

                  <span className="step-copy">
                    <span className="step-label">{step.label}</span>
                    {at ? (
                      <time className="step-time" dateTime={at}>
                        {formatDate(at)}
                      </time>
                    ) : null}
                  </span>

                  {index < ORDER_PROGRESS_STEPS.length - 1 ? (
                    <span className="step-connector" aria-hidden="true" />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>

        {isException ? (
          <div className={`order-status-note is-${order.status}`}>
            <Icon
              name={
                order.status === 'refunded'
                  ? 'refresh'
                  : order.status === 'payment_failed'
                    ? 'alert-circle'
                    : 'x-circle'
              }
              size={18}
            />
            <span>
              {order.status === 'refunded'
                ? 'This order was delivered and the payment has been refunded.'
                : order.status === 'payment_failed'
                  ? 'The payment for this order did not go through. No order was placed with the kitchen.'
                  : 'This order was cancelled. If you were charged, it has been released back to your payment method.'}
            </span>
          </div>
        ) : null}

        {/* What is happening right now, and the three things a customer
            actually looks up on an order page. */}
        <div className="order-facts">
          <div className="order-next">
            <span className="order-next-icon">
              <Icon name={NEXT_STEP[order.status]?.icon || 'sparkles'} size={18} />
            </span>
            <span className="order-next-copy">
              <span className="order-next-label">
                {order.status === 'delivered' ? 'Completed' : 'Right now'}
              </span>
              <span className="order-next-value">
                {NEXT_STEP[order.status]?.title || 'In the kitchen'}
              </span>
              <span className="order-next-note">
                {NEXT_STEP[order.status]?.note || 'We will keep you posted.'}
              </span>
            </span>
          </div>

          <dl className="order-fact-grid">
            <div className="order-fact">
              <dt>Items</dt>
              <dd>
                {itemCount} {itemCount === 1 ? 'dish' : 'dishes'}
              </dd>
            </div>
            <div className="order-fact">
              <dt>Delivering to</dt>
              <dd>
                {order.addressSnapshot?.city
                  ? `${order.addressSnapshot.city}${order.addressSnapshot.state ? `, ${order.addressSnapshot.state}` : ''}`
                  : 'Address on order'}
              </dd>
            </div>
            <div className="order-fact">
              <dt>Payment</dt>
              <dd>
                {order.paymentStatus === 'paid'
                  ? 'Paid'
                  : order.paymentStatus === 'refunded'
                    ? 'Refunded'
                    : order.paymentStatus === 'failed'
                      ? 'Failed'
                      : 'Pending'}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {actionError ? (
        <div className="order-action-error" role="alert">
          <Icon name="alert-circle" size={18} />
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)}>Dismiss</button>
        </div>
      ) : null}

      <div className="order-content">
        <section className="order-section items-section">
          <h2>Items ({itemCount})</h2>
          <div className="order-items">
            {(order.items || []).map((item, index) => (
              <article key={item.productId || `${item.name}-${index}`} className="order-item">
                {item.slug ? (
                  <Link to={`/product/${item.slug}`} className="item-image-link">
                    <SafeImage
                      src={resolveOrderImage(item.imageUrl)}
                      alt={item.name}
                      className="item-image"
                      fallbackClassName="item-image-fallback"
                      fallbackSize={24}
                    />
                  </Link>
                ) : (
                  <span className="item-image-link">
                    <SafeImage
                      src={resolveOrderImage(item.imageUrl)}
                      alt={item.name}
                      className="item-image"
                      fallbackClassName="item-image-fallback"
                      fallbackSize={24}
                    />
                  </span>
                )}
                <div className="item-details">
                  {item.slug ? (
                    <Link to={`/product/${item.slug}`} className="item-name">{item.name}</Link>
                  ) : (
                    <span className="item-name">{item.name}</span>
                  )}
                  <div className="item-meta">
                    <span>Qty: {item.quantity}</span>
                    <span>{formatINR(item.unitPricePaise)} each</span>
                  </div>
                </div>
                <div className="item-total">{formatINR(item.lineTotalPaise)}</div>
              </article>
            ))}
          </div>
        </section>

        <div className="order-grid">
          <section className="order-section pricing-section">
            <h2>Price details</h2>
            <dl className="pricing-breakdown">
              <div className="price-row">
                <dt>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</dt>
                <dd>{formatINR(order.pricing?.subtotalPaise || 0)}</dd>
              </div>
              {order.pricing?.discountPaise > 0 ? (
                <div className="price-row discount">
                  <dt>Discount {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                  <dd>-{formatINR(order.pricing.discountPaise)}</dd>
                </div>
              ) : null}
              <div className="price-row">
                <dt>Delivery</dt>
                <dd>{order.pricing?.deliveryFeePaise > 0 ? formatINR(order.pricing.deliveryFeePaise) : 'Free'}</dd>
              </div>
              <div className="price-row">
                <dt>Tax</dt>
                <dd>{formatINR(order.pricing?.taxPaise || 0)}</dd>
              </div>
              <div className="price-row total">
                <dt>Total paid</dt>
                <dd>{formatINR(order.pricing?.totalPaise || 0)}</dd>
              </div>
            </dl>
          </section>

          <section className="order-section address-section">
            <h2>Delivery address</h2>
            {order.addressSnapshot ? (
              <address className="delivery-address">
                <p><strong>{order.addressSnapshot.recipientName}</strong></p>
                <p>{order.addressSnapshot.phone}</p>
                <p>{order.addressSnapshot.line1}</p>
                {order.addressSnapshot.line2 ? <p>{order.addressSnapshot.line2}</p> : null}
                {order.addressSnapshot.landmark ? <p>Landmark: {order.addressSnapshot.landmark}</p> : null}
                <p>
                  {order.addressSnapshot.city}, {order.addressSnapshot.state} - {order.addressSnapshot.pincode}
                </p>
              </address>
            ) : (
              <p className="order-muted">No address on file for this order.</p>
            )}
          </section>

          {order.statusHistory?.length > 0 ? (
            <section className="order-section timeline-section">
              <h2>Order timeline</h2>
              <ul className="timeline">
                {order.statusHistory
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <li key={`${entry.status}-${entry.at}-${index}`} className="timeline-item">
                      <div className="timeline-marker" />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-status">
                            {ORDER_STATUS_LABELS[entry.status] || entry.status}
                          </span>
                          <time className="timeline-time" dateTime={entry.at}>
                            {formatDate(entry.at)}
                          </time>
                        </div>
                        {entry.note ? <p className="timeline-note">{entry.note}</p> : null}
                        {entry.byUserId ? (
                          <p className="timeline-by">Updated by {entry.byUserId.slice(-6)}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          <section className="order-section actions-section">
            <h2>Actions</h2>

            {showCancelForm ? (
              <form className="order-cancel-form" onSubmit={handleCancelSubmit} noValidate>
                <div className="form-field">
                  <label htmlFor="cancel-reason">Why are you cancelling?</label>
                  <textarea
                    id="cancel-reason"
                    value={cancelReason}
                    onChange={(event) => {
                      setCancelReason(event.target.value);
                      if (cancelErrors.reason) setCancelErrors({});
                    }}
                    rows={3}
                    className={`order-cancel-textarea ${cancelErrors.reason ? 'has-error' : ''}`.trim()}
                    placeholder="e.g. Ordered by mistake"
                    aria-invalid={cancelErrors.reason ? 'true' : undefined}
                    aria-describedby={cancelErrors.reason ? 'cancel-error' : undefined}
                    disabled={isCancelling}
                  />
                  {cancelErrors.reason ? (
                    <p className="field-error" id="cancel-error" role="alert">{cancelErrors.reason}</p>
                  ) : null}
                </div>
                <div className="order-cancel-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeCancelForm}
                    disabled={isCancelling}
                  >
                    Keep order
                  </Button>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="order-cancel-submit"
                    loading={isCancelling}
                  >
                    Confirm cancellation
                  </Button>
                </div>
              </form>
            ) : (
              <div className="action-buttons">
                {isCancellableOrder(order.status) ? (
                  <Button
                    variant="ghost"
                    className="order-cancel-submit"
                    onClick={() => {
                      setShowCancelForm(true);
                      setActionError(null);
                    }}
                    fullWidth
                  >
                    Cancel order
                  </Button>
                ) : null}
                {order.status === 'delivered' ? (
                  <Button
                    variant="outline"
                    onClick={handleReorder}
                    loading={isReordering}
                    fullWidth
                  >
                    Reorder items
                  </Button>
                ) : null}
                {order.payment?.sessionId ? (
                  <Link to={`/verify?session_id=${order.payment.sessionId}`} className="btn-link">
                    View payment receipt
                  </Link>
                ) : null}
                {!isCancellableOrder(order.status) && order.status !== 'delivered' && !order.payment?.sessionId ? (
                  <p className="order-muted">No actions are available for this order.</p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </motion.div>
  );
}
