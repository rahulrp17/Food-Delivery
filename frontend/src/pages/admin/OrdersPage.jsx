import { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import DataTable from '../../components/admin/DataTable';
import OrderItemsPreview from '../../components/admin/OrderItemsPreview';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { ConfirmDialog } from '../../components/admin/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { FilterToolbar, SearchInput, FilterSelect, FilterInput } from '../../components/ui/FilterToolbar';
import { OrderTableSkeleton, OrderListSkeleton } from '../../components/loading';
import { formatINR, formatDate } from '../../lib/format';
import {
  ADMIN_NEXT_STATUS,
  ORDER_BOARD_COLUMNS,
  ORDER_PROGRESS_STEPS,
  formatOrderStatus,
} from '../../lib/orders';
import { getErrorMessage } from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import OrderStatusBadge, { PaymentStatusBadge } from '../../components/admin/StatusBadge';
import OrderDrawer from './OrderDrawer';
import './OrdersPage.css';

const STATUS_FILTERS = [
  { value: '', label: 'All orders' },
  { value: 'pending_payment', label: 'Awaiting payment' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'payment_failed', label: 'Payment failed' },
  { value: 'refunded', label: 'Refunded' },
];

const OVERVIEW_STATUSES = [
  { value: 'pending_payment', label: 'Awaiting payment' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_OPTIONS = [
  { value: '', label: 'All payments' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const liveRefetchInterval = () =>
  typeof document !== 'undefined' && document.visibilityState === 'hidden' ? false : 20000;

export default function OrdersPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const reduceMotion = useReducedMotion();
  const [view, setView] = useState('table');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);

  useDocumentTitle('Orders');

  useEffect(() => {
    const nextSearch = searchParams.get('q') || '';
    setSearch(nextSearch);
    setPage(1);
  }, [searchParams]);

  const params = {
    status: status || undefined,
    paymentStatus: paymentStatus || undefined,
    q: search || undefined,
    from: from || undefined,
    to: to || undefined,
    page: view === 'board' ? 1 : page,
    limit: view === 'board' ? 100 : 20,
  };

  const {
    data,
    isPending,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.orders(params),
    queryFn: () => adminApi.orders(params),
    placeholderData: keepPreviousData,
    refetchInterval: liveRefetchInterval,
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, nextStatus }) => adminApi.updateOrderStatus(orderId, nextStatus),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.order(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview() });
      showSuccess(`Order marked ${formatOrderStatus(variables.nextStatus)}`);
      setPendingStatusChange(null);
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to update order status'));
    },
  });

  const orders = useMemo(() => data?.items || [], [data]);
  const meta = data?.meta || { total: 0, totalPages: 1, statusCounts: {} };
  const statusCounts = meta.statusCounts || {};
  const hasFilters = Boolean(status || paymentStatus || search || from || to);

  const boardColumns = useMemo(
    () =>
      ORDER_BOARD_COLUMNS.map((column) => ({
        ...column,
        orders: orders.filter((order) => column.statuses.includes(order.status)),
      })),
    [orders]
  );

  const applyStatusFilter = (nextStatus) => {
    setStatus(nextStatus);
    setPage(1);
  };

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setPage(1);
  }, []);

  const clearFilters = () => {
    setStatus('');
    setPaymentStatus('');
    setSearch('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return false;
    await statusMutation.mutateAsync({
      orderId: pendingStatusChange.order.id,
      nextStatus: pendingStatusChange.next.status,
    });
  };

  const progressIndexFor = (orderStatus) => {
    const index = ORDER_PROGRESS_STEPS.findIndex((step) => step.key === orderStatus);
    if (index !== -1) return index;
    if (orderStatus === 'cancelled' || orderStatus === 'payment_failed' || orderStatus === 'refunded') {
      return -1;
    }
    return 0;
  };

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order #',
      width: '140px',
      render: (r) => (
        <button
          type="button"
          className="order-open-link"
          onClick={() => setActiveOrderId(r.id)}
        >
          {r.orderNumber}
        </button>
      ),
    },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.name || 'Guest' },
    {
      key: 'items',
      header: 'Items',
      width: '170px',
      render: (r) => <OrderItemsPreview items={r.items} max={3} showNames />,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      width: '100px',
      render: (r) => formatINR(r.pricing?.totalPaise),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (r) => <OrderStatusBadge status={r.status} />,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      width: '110px',
      render: (r) => <PaymentStatusBadge status={r.paymentStatus} />,
    },
    {
      key: 'placedAt',
      header: 'Date',
      width: '145px',
      render: (r) => formatDate(r.placedAt),
    },
    {
      key: 'next',
      header: 'Next step',
      width: '150px',
      render: (r) => {
        const next = ADMIN_NEXT_STATUS[r.status];
        return next ? (
          <button
            type="button"
            className="order-next-action"
            onClick={() => setPendingStatusChange({ order: r, next })}
          >
            {next.label}
            <Icon name="arrow-right" size={14} label="" />
          </button>
        ) : (
          <span className="order-next-complete">No action</span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '84px',
      render: (r) => (
        <div className="order-row-actions">
          <button
            type="button"
            className="row-action"
            aria-label={`Preview order ${r.orderNumber}`}
            onClick={() => setActiveOrderId(r.id)}
          >
            <Icon name="eye" size={16} label="" />
          </button>
          <Link
            to={`/admin/orders/${r.id}`}
            className="row-action"
            aria-label={`Open order ${r.orderNumber}`}
          >
            <Icon name="arrow-right" size={16} label="" />
          </Link>
        </div>
      ),
    },
  ];

  const boardMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: 'easeOut' },
      };

  const stripMotion = (index) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.2, ease: 'easeOut', delay: index * 0.03 },
        };

  return (
    <div className="admin-orders-page">
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p className="page-subtitle">Track kitchen, delivery, and payment status.</p>
        </div>
        <div className="orders-page-tools">
          <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing" />
          <span className="page-count">{isPending ? '—' : `${meta.total} orders`}</span>
          <div className="view-switch" role="group" aria-label="Switch order view">
            <button
              type="button"
              className={`view-switch-btn ${view === 'table' ? 'is-active' : ''}`}
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
            >
              <Icon name="list" size={16} label="" />
              Table
            </button>
            <button
              type="button"
              className={`view-switch-btn ${view === 'board' ? 'is-active' : ''}`}
              aria-pressed={view === 'board'}
              onClick={() => setView('board')}
            >
              <Icon name="columns" size={16} label="" />
              Board
            </button>
          </div>
        </div>
      </div>

      <section
        className="orders-overview-strip"
        aria-label="Orders by status"
        aria-busy={isPending}
      >
        {OVERVIEW_STATUSES.map((item, index) => {
          if (isPending) {
            return (
              <div
                key={item.value}
                className="orders-overview-card orders-overview-skeleton"
                aria-hidden="true"
              >
                <span className="skeleton orders-skeleton-label" />
                <span className="skeleton orders-skeleton-value" />
                <span className="skeleton orders-skeleton-bar" />
              </div>
            );
          }
          const count = statusCounts[item.value] || 0;
          const total = statusCounts.all || 0;
          const share = total > 0 ? Math.round((count / total) * 100) : 0;
          const isActive = status === item.value;
          return (
            <motion.button
              key={item.value}
              type="button"
              className={`orders-overview-card${isActive ? ' is-active' : ''}`}
              aria-pressed={isActive}
              onClick={() => applyStatusFilter(isActive ? '' : item.value)}
              {...stripMotion(index)}
            >
              <span className="orders-overview-label">{item.label}</span>
              <span className="orders-overview-value">{count}</span>
              <span className="orders-overview-bar" aria-hidden="true">
                <span style={{ width: `${Math.max(count > 0 ? 6 : 0, share)}%` }} />
              </span>
              <span className="orders-overview-share">{share}% of orders</span>
            </motion.button>
          );
        })}
      </section>

      <form onSubmit={handleSearch}>
        <FilterToolbar
          actions={
            <>
              <Button type="submit" variant="secondary" iconLeft={<Icon name="filter" size={16} />}>
                Filter
              </Button>
              {hasFilters && (
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </>
          }
        >
          <SearchInput
            id="search"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search order #, customer, phone..."
            label="Search orders"
          />
          <FilterSelect
            id="paymentStatus"
            label="Payment"
            value={paymentStatus}
            onChange={(value) => {
              setPaymentStatus(value);
              setPage(1);
            }}
            options={PAYMENT_OPTIONS}
          />
          <FilterInput
            id="from"
            label="From"
            type="date"
            value={from}
            onChange={(value) => {
              setFrom(value);
              setPage(1);
            }}
          />
          <FilterInput
            id="to"
            label="To"
            type="date"
            value={to}
            onChange={(value) => {
              setTo(value);
              setPage(1);
            }}
          />
        </FilterToolbar>
      </form>

      {isPending ? (
        view === 'board' ? (
          <div className="order-board-wrap" aria-busy="true">
            <OrderListSkeleton count={4} />
          </div>
        ) : (
          <div aria-busy="true">
            <OrderTableSkeleton rows={8} />
          </div>
        )
      ) : error ? (
        <ErrorState
          title="We could not load the orders"
          description="The order service did not respond. Check your connection and try again."
          onRetry={refetch}
        />
      ) : view === 'table' ? (
        <DataTable
          className={isPlaceholderData ? 'is-placeholder' : ''}
          columns={columns}
          rows={orders}
          rowKey={(r) => r.id}
          page={page}
          pageCount={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
          empty={
            <EmptyState
              icon="truck"
              title="Nothing ordered yet"
              description={
                hasFilters
                  ? 'No order matches the filters you picked. Try widening the date range or clearing the status.'
                  : 'Once customers start ordering, their orders will appear here.'
              }
              actions={
                hasFilters ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null
              }
            />
          }
        />
      ) : (
        <div className="order-board-wrap">
          <div className="order-board" role="list" aria-label="Orders grouped by status">
            {boardColumns.map((column) => (
              <motion.section
                key={column.key}
                className={`order-board-column order-board-column-${column.key}`}
                role="listitem"
                aria-label={`${column.label}, ${column.orders.length} orders`}
                {...boardMotion}
              >
                <header className="order-board-column-head">
                  <span>{column.label}</span>
                  <span className="order-board-count">{column.orders.length}</span>
                </header>
                <div className="order-board-cards">
                  {column.orders.length === 0 ? (
                    <p className="order-board-empty">No orders</p>
                  ) : (
                    column.orders.map((order) => {
                      const next = ADMIN_NEXT_STATUS[order.status];
                      const progressIndex = progressIndexFor(order.status);
                      return (
                        <article key={order.id} className="order-card">
                          <button
                            type="button"
                            className="order-card-main"
                            onClick={() => setActiveOrderId(order.id)}
                            aria-label={`Open order ${order.orderNumber}`}
                          >
                            <div className="order-card-top">
                              <strong>{order.orderNumber}</strong>
                              <span className="order-card-total">
                                {formatINR(order.pricing?.totalPaise)}
                              </span>
                            </div>
                            <p className="order-card-customer">
                              {order.customer?.name || 'Guest customer'}
                            </p>
                            <div className="order-card-meta">
                              <span>
                                {order.items?.length || 0}{' '}
                                {order.items?.length === 1 ? 'item' : 'items'}
                              </span>
                              <span>{formatDate(order.placedAt)}</span>
                            </div>
                            <ol className="order-card-timeline" aria-label="Order progress">
                              {ORDER_PROGRESS_STEPS.map((step, index) => (
                                <li
                                  key={step.key}
                                  className={
                                    progressIndex >= 0 && index <= progressIndex
                                      ? 'is-done'
                                      : 'is-pending'
                                  }
                                >
                                  <span className="order-card-timeline-dot" aria-hidden="true" />
                                  <span className="visually-hidden">{step.label}</span>
                                </li>
                              ))}
                            </ol>
                            <div className="order-card-badges">
                              <PaymentStatusBadge status={order.paymentStatus} />
                            </div>
                          </button>
                          {next ? (
                            <button
                              type="button"
                              className="order-card-next"
                              onClick={() => setPendingStatusChange({ order, next })}
                            >
                              {next.label}
                              <Icon name="arrow-right" size={13} label="" />
                            </button>
                          ) : null}
                        </article>
                      );
                    })
                  )}
                </div>
              </motion.section>
            ))}
          </div>
          {meta.total > orders.length ? (
            <p className="order-board-note">
              Showing the {orders.length} most recent orders. Refine filters to narrow results.
            </p>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingStatusChange)}
        onClose={() => setPendingStatusChange(null)}
        onConfirm={confirmStatusChange}
        title="Update order status"
        message={
          pendingStatusChange
            ? `Move ${pendingStatusChange.order.orderNumber} to ${formatOrderStatus(pendingStatusChange.next.status)}?`
            : ''
        }
        confirmText="Yes, update status"
        variant="primary"
        loading={statusMutation.isPending}
      />

      {activeOrderId ? (
        <OrderDrawer orderId={activeOrderId} onClose={() => setActiveOrderId(null)} />
      ) : null}
    </div>
  );
}
