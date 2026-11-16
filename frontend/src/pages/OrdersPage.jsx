import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders.api';
import { formatINR, formatDate } from '../lib/format';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
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
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import './OrdersPage.css';

const getItemCount = (order) =>
  order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

const OrderSkeleton = () => (
  <div className="orders-skeleton" aria-hidden="true">
    {[...Array(3)].map((_, index) => (
      <div key={index} className="order-skeleton">
        <div className="skeleton-row">
          <span className="skeleton skeleton-text-lg" />
          <span className="skeleton skeleton-pill" />
        </div>
        <span className="skeleton skeleton-line" />
        <span className="skeleton skeleton-line skeleton-line-short" />
        <div className="skeleton-row skeleton-row-footer">
          <span className="skeleton skeleton-text" />
          <span className="skeleton skeleton-button" />
        </div>
      </div>
    ))}
  </div>
);

export default function OrdersPage() {
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelErrors, setCancelErrors] = useState({});
  const [isCancelling, setIsCancelling] = useState(false);

  const loadOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setIsLoading(true);
      setLoadError(null);
      try {
        const params = { page: pagination.page, limit: pagination.limit };
        if (statusFilter) params.status = statusFilter;
        const res = await ordersApi.list(params);
        setOrders(res.items || []);
        setPagination((prev) => ({
          ...prev,
          ...(res.meta || {}),
          limit: res.meta?.limit ?? prev.limit,
        }));
      } catch (error) {
        setLoadError(getErrorMessage(error, 'Failed to load your orders'));
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [pagination.page, pagination.limit, statusFilter]
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleFilterChange = (value) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setCancelOrderId(null);
    setCancelReason('');
    setCancelErrors({});
  };

  const openCancelForm = (orderId) => {
    setCancelOrderId(orderId);
    setCancelReason('');
    setCancelErrors({});
    setActionError(null);
    window.requestAnimationFrame(() => {
      document.getElementById(`cancel-reason-${orderId}`)?.focus();
    });
  };

  const closeCancelForm = () => {
    setCancelOrderId(null);
    setCancelReason('');
    setCancelErrors({});
  };

  const handleReorder = async (orderId) => {
    setBusyOrderId(orderId);
    setActionError(null);
    try {
      await ordersApi.reorder(orderId);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      showSuccess('Items added back to your cart');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to reorder items');
      setActionError(message);
      showError(message);
    } finally {
      setBusyOrderId(null);
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
      await ordersApi.cancel(cancelOrderId, parsed.data.reason);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === cancelOrderId ? { ...order, status: 'cancelled' } : order
        )
      );
      closeCancelForm();
      showSuccess('Order cancelled');
      await loadOrders({ silent: true });
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to cancel order');
      setActionError(message);
      showError(message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="orders-page">
        <header className="orders-heading">
          <div>
            <span className="eyebrow">Order history</span>
            <h1>My orders</h1>
            <p>Track every order from the kitchen to your door.</p>
          </div>
        </header>
        <OrderSkeleton />
      </div>
    );
  }

  if (loadError && orders.length === 0) {
    return (
      <div className="orders-page">
        <header className="orders-heading">
          <div>
            <span className="eyebrow">Order history</span>
            <h1>My orders</h1>
            <p>Track every order from the kitchen to your door.</p>
          </div>
        </header>
        <EmptyState
          icon="alert-circle"
          headingLevel="h2"
          title="We could not load your orders"
          description={loadError}
          actions={
            <Button onClick={() => loadOrders()} iconLeft={<Icon name="refresh" size={16} />}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const selectedFilterLabel =
    ORDER_STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label || 'All orders';

  return (
    <motion.div
      className="orders-page"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.2 : 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="orders-heading">
        <div>
          <span className="eyebrow">Order history</span>
          <h1>My orders</h1>
          <p>Track every order from the kitchen to your door.</p>
        </div>
        <div className="orders-heading-meta">
          <span className="orders-total-pill">
            <Icon name="package" size={16} />
            {pagination.total} {pagination.total === 1 ? 'order' : 'orders'}
          </span>
          <Button to="/menu" variant="secondary" iconRight={<Icon name="arrow-right" size={16} />}>
            Order again
          </Button>
        </div>
      </header>

      <div className="orders-toolbar">
        <div className="orders-filters" role="group" aria-label="Filter orders by status">
          {ORDER_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              className={`order-filter ${statusFilter === option.value ? 'is-active' : ''}`.trim()}
              aria-pressed={statusFilter === option.value}
              onClick={() => handleFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loadError ? (
        <div className="orders-inline-error" role="alert">
          <Icon name="alert-circle" size={18} />
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => loadOrders()}>Retry</Button>
        </div>
      ) : null}

      {actionError ? (
        <div className="orders-inline-error" role="alert">
          <Icon name="alert-circle" size={18} />
          <span>{actionError}</span>
          <button type="button" className="orders-error-dismiss" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {orders.length === 0 ? (
        <EmptyState
          icon="package"
          headingLevel="h2"
          title={statusFilter ? `No ${selectedFilterLabel.toLowerCase()} orders` : 'No orders yet'}
          description={
            statusFilter
              ? 'Try another status or clear the filter to see all your orders.'
              : 'When you place an order, it will appear here with live updates.'
          }
          actions={
            statusFilter ? (
              <>
                <Button variant="outline" onClick={() => handleFilterChange('')}>Clear filter</Button>
                <Button to="/menu">Explore the menu</Button>
              </>
            ) : (
              <Button to="/menu">Explore the menu</Button>
            )
          }
        />
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const itemCount = getItemCount(order);
            const active = isActiveOrder(order.status);
            const isCancellingThisOrder = cancelOrderId === order.id;
            const busy = busyOrderId === order.id || (isCancelling && isCancellingThisOrder);

            return (
              <article key={order.id} className={`order-card ${active ? 'is-active' : ''}`.trim()}>
                <header className="order-header">
                  <div className="order-meta">
                    <div className="order-number-row">
                      <Link to={`/orders/${order.id}`} className="order-number">
                        #{order.id.slice(-8).toUpperCase()}
                      </Link>
                      {active ? <span className="order-live-dot" aria-label="Active order" /> : null}
                    </div>
                    <span className="order-date">{formatDate(order.placedAt)}</span>
                  </div>
                  <Badge tone={ORDER_STATUS_VARIANTS[order.status] || 'neutral'}>
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </Badge>
                </header>

                <div className="order-items-preview">
                  {(order.items || []).slice(0, 3).map((item, index) => (
                    <div key={`${item.productId || item.name}-${index}`} className="order-item-preview">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="item-thumb" loading="lazy" />
                      ) : (
                        <span className="item-thumb item-thumb-fallback">
                          <Icon name="chef-hat" size={18} />
                        </span>
                      )}
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-qty">Qty {item.quantity}</span>
                      </div>
                    </div>
                  ))}
                  {(order.items?.length || 0) > 3 ? (
                    <span className="more-items">+{order.items.length - 3} more</span>
                  ) : null}
                </div>

                <footer className="order-footer">
                  <div className="order-total">
                    <span>{itemCount} {itemCount === 1 ? 'item' : 'items'} · Total</span>
                    <strong>{formatINR(order.pricing?.totalPaise || 0)}</strong>
                  </div>
                  <div className="order-actions">
                    <Link to={`/orders/${order.id}`} className="btn-view">
                      View details <Icon name="chevron-right" size={15} />
                    </Link>
                    {order.status === 'delivered' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={busy}
                        onClick={() => handleReorder(order.id)}
                      >
                        Reorder
                      </Button>
                    ) : null}
                    {isCancellableOrder(order.status) && !isCancellingThisOrder ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="order-cancel-button"
                        onClick={() => openCancelForm(order.id)}
                        disabled={busy}
                      >
                        Cancel order
                      </Button>
                    ) : null}
                  </div>
                </footer>

                {isCancellingThisOrder ? (
                  <form className="order-cancel-form" onSubmit={handleCancelSubmit} noValidate>
                    <div className="order-cancel-copy">
                      <strong>Cancel this order?</strong>
                      <p>Tell us why so we can improve. This cannot be undone.</p>
                    </div>
                    <div className="form-field">
                      <label htmlFor={`cancel-reason-${order.id}`}>Reason</label>
                      <textarea
                        id={`cancel-reason-${order.id}`}
                        value={cancelReason}
                        onChange={(event) => {
                          setCancelReason(event.target.value);
                          if (cancelErrors.reason) setCancelErrors({});
                        }}
                        rows={2}
                        className={`order-cancel-textarea ${cancelErrors.reason ? 'has-error' : ''}`.trim()}
                        aria-invalid={cancelErrors.reason ? 'true' : undefined}
                        aria-describedby={cancelErrors.reason ? `cancel-error-${order.id}` : undefined}
                        placeholder="e.g. Ordered by mistake"
                        disabled={isCancelling}
                      />
                      {cancelErrors.reason ? (
                        <p className="field-error" id={`cancel-error-${order.id}`} role="alert">
                          {cancelErrors.reason}
                        </p>
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
                        className="order-cancel-button"
                        loading={isCancelling}
                      >
                        Confirm cancellation
                      </Button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 ? (
        <nav className="orders-pagination" aria-label="Orders pagination">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page <= 1 || isLoading}
          >
            Previous
          </Button>
          <span className="page-info" aria-live="polite">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages || isLoading}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </motion.div>
  );
}
