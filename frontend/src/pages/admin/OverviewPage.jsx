import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import StatCard from '../../components/admin/StatCard';
import BarChart from '../../components/admin/BarChart';
import DataTable from '../../components/admin/DataTable';
import DonutChart from '../../components/admin/DonutChart';
import OrderItemsPreview from '../../components/admin/OrderItemsPreview';
import FoodThumb from '../../components/admin/FoodThumb';
import { formatINR, formatShortDate, formatDate } from '../../lib/format';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { KpiSkeleton } from '../../components/loading';
import OrderStatusBadge, { PaymentStatusBadge } from '../../components/admin/StatusBadge';
import './OverviewPage.css';

const STATUS_META = {
  pending_payment: { label: 'Awaiting payment', color: 'var(--saffron-500)' },
  confirmed: { label: 'Confirmed', color: 'var(--info-600)' },
  preparing: { label: 'Preparing', color: 'var(--tomato-500)' },
  food_processing: { label: 'Processing', color: 'var(--tomato-700)' },
  out_for_delivery: { label: 'Out for delivery', color: 'var(--saffron-600)' },
  delivered: { label: 'Delivered', color: 'var(--herb-500)' },
  cancelled: { label: 'Cancelled', color: 'var(--danger-600)' },
  payment_failed: { label: 'Payment failed', color: 'var(--danger-700)' },
  refunded: { label: 'Refunded', color: 'var(--ink-400)' },
};

const formatStatus = (status) =>
  STATUS_META[status]?.label ||
  String(status)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const countFor = (breakdown, status) =>
  breakdown.find((entry) => entry.status === status)?.count || 0;

/**
 * Compact inline error used inside a dashboard panel. Each panel owns its
 * own retry affordance so a single failing region never blanks the page.
 */
function PanelError({ message, onRetry }) {
  return (
    <div className="overview-panel-error" role="alert">
      <Icon name="alert-circle" size={18} label="" aria-hidden="true" />
      <p>{message}</p>
      <Button
        variant="secondary"
        size="sm"
        onClick={onRetry}
        iconLeft={<Icon name="refresh" size={14} />}
      >
        Retry
      </Button>
    </div>
  );
}

export default function OverviewPage() {
  const [seriesView, setSeriesView] = useState('7d');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const reduceMotion = useReducedMotion();

  useDocumentTitle('Overview');

  const overviewParams = {
    from: dateRange.from || undefined,
    to: dateRange.to || undefined,
  };

  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useQuery({
    queryKey: queryKeys.admin.overview(overviewParams),
    queryFn: () => adminApi.overview(overviewParams),
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  });

  const overview = data || {};
  const series = overview.series || [];
  const recentOrders = overview.recentOrders || [];
  const topProducts = overview.topProducts || [];
  const recentCustomers = overview.recentCustomers || [];
  const statusBreakdown = overview.statusBreakdown || [];
  const categoryBreakdown = overview.categoryBreakdown || [];
  const lowStockProducts = overview.lowStockProducts || [];
  const activeOrderCount = overview.activeOrderCount || 0;
  const pendingOrderCount = overview.pendingOrderCount || 0;
  const customerCount = overview.customerCount || 0;
  const today = overview.today || { revenuePaise: 0, orderCount: 0 };

  const chartData =
    seriesView === '7d' ? series.slice(-7) : seriesView === '30d' ? series.slice(-30) : series;

  const rangeLabel =
    dateRange.from && dateRange.to
      ? `${formatShortDate(dateRange.from)} to ${formatShortDate(dateRange.to)}`
      : seriesView === '7d'
        ? '7 days'
        : '30 days';

  const revRange = chartData.reduce((sum, item) => sum + (item.revenuePaise || 0), 0);
  const ordRange = chartData.reduce((sum, item) => sum + (item.orderCount || 0), 0);
  const aovRange = ordRange > 0 ? Math.round(revRange / ordRange) : 0;

  const statusData = statusBreakdown.map((entry) => ({
    label: formatStatus(entry.status),
    value: entry.count,
    color: STATUS_META[entry.status]?.color || 'var(--ink-400)',
  }));

  const maxCategoryRevenue = Math.max(
    1,
    ...categoryBreakdown.map((category) => category.revenuePaise || 0)
  );

  const failedOrders = countFor(statusBreakdown, 'payment_failed');
  const cancelledOrders = countFor(statusBreakdown, 'cancelled');
  const outOfStock = lowStockProducts.filter((product) => product.stock === 0);
  const lowStockOnly = lowStockProducts.filter((product) => product.stock > 0);

  const alerts = [
    pendingOrderCount > 0 && {
      id: 'pending-payment',
      tone: 'warning',
      icon: 'credit-card',
      title: `${pendingOrderCount} order${pendingOrderCount === 1 ? '' : 's'} awaiting payment`,
      detail: 'Payment has not been confirmed for these orders yet.',
      to: '/admin/orders?status=pending_payment',
    },
    failedOrders > 0 && {
      id: 'payment-failed',
      tone: 'danger',
      icon: 'alert-circle',
      title: `${failedOrders} failed payment${failedOrders === 1 ? '' : 's'}`,
      detail: 'These orders need a payment retry or cancellation.',
      to: '/admin/orders?status=payment_failed',
    },
    cancelledOrders > 0 && {
      id: 'cancelled',
      tone: 'danger',
      icon: 'x',
      title: `${cancelledOrders} cancelled order${cancelledOrders === 1 ? '' : 's'}`,
      detail: 'Cancelled orders still count towards the daily order total.',
      to: '/admin/orders?status=cancelled',
    },
    outOfStock.length > 0 && {
      id: 'out-of-stock',
      tone: 'danger',
      icon: 'package',
      title: `${outOfStock.length} product${outOfStock.length === 1 ? '' : 's'} out of stock`,
      detail: outOfStock.map((product) => product.name).slice(0, 3).join(', '),
      to: '/admin/products?stock=low',
    },
    lowStockOnly.length > 0 && {
      id: 'low-stock',
      tone: 'warning',
      icon: 'bar-chart',
      title: `${lowStockOnly.length} product${lowStockOnly.length === 1 ? '' : 's'} running low`,
      detail: 'Ten units or fewer left in the kitchen.',
      to: '/admin/products?stock=low',
    },
  ].filter(Boolean);

  const activityFeed = [
    ...recentOrders.map((order) => ({
      id: `order-${order.id}`,
      tone: order.status === 'cancelled' ? 'danger' : 'brand',
      title: `Order ${order.orderNumber} · ${formatINR(order.pricing?.totalPaise)}`,
      detail: order.customer?.name || 'Guest customer',
      time: order.placedAt,
      to: `/admin/orders/${order.id}`,
    })),
    ...recentCustomers.map((customer) => ({
      id: `customer-${customer.id}`,
      tone: 'success',
      title: `${customer.name} joined Foodie`,
      detail: customer.email,
      time: customer.createdAt,
      to: `/admin/customers/${customer.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
    .slice(0, 8);

  const exportRevenueCsv = () => {
    const rows = [
      ['Date', 'Revenue (INR)', 'Orders'],
      ...chartData.map((item) => [
        item.date,
        (item.revenuePaise / 100).toFixed(2),
        item.orderCount,
      ]),
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `foodie-revenue-${seriesView}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const orderColumns = [
    { key: 'orderNumber', header: 'Order', width: '155px' },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <span className="overview-order-customer">
          <strong>{row.customer?.name || 'Guest'}</strong>
          <span>{row.customer?.email || row.customer?.phone || row.userId || '-'}</span>
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      width: '210px',
      render: (row) => <OrderItemsPreview items={row.items} max={3} showNames />,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      width: '110px',
      render: (row) => formatINR(row.pricing?.totalPaise),
    },
    {
      key: 'status',
      header: 'Status',
      width: '150px',
      render: (row) => <OrderStatusBadge status={row.status} />,
    },
    {
      key: 'payment',
      header: 'Payment',
      width: '110px',
      render: (row) => <PaymentStatusBadge status={row.paymentStatus} />,
    },
    {
      key: 'date',
      header: 'Date',
      width: '150px',
      render: (row) => formatDate(row.placedAt),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (row) => (
        <Link
          to={`/admin/orders/${row.id}`}
          className="row-action"
          aria-label={`View order ${row.orderNumber || row.id}`}
        >
          <Icon name="arrow-right" size={16} label="" />
        </Link>
      ),
    },
  ];

  const panelMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24, ease: 'easeOut' },
      };

  return (
    <div className="overview-page">
      <header className="overview-hero">
        <div className="overview-hero-copy">
          <span className="overview-eyebrow">
            <span className="overview-live-dot" />
            Live operations
          </span>
          <h1>Kitchen dashboard</h1>
          <p>Revenue, order flow, and customers at a glance.</p>
          <div className="overview-today">
            <span>
              <Icon name="credit-card" size={16} label="" />
              <strong>{formatINR(today.revenuePaise)}</strong> today
            </span>
            <span>
              <Icon name="shopping-bag" size={16} label="" />
              <strong>{today.orderCount}</strong> orders today
            </span>
            <span>
              <Icon name="truck" size={16} label="" />
              <strong>{activeOrderCount}</strong> active now
            </span>
          </div>
        </div>
        <div className="overview-hero-actions">
          <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing" />
          <Button
            variant="secondary"
            onClick={() => refetch()}
            loading={isFetching}
            iconLeft={<Icon name="refresh" size={16} />}
          >
            Refresh
          </Button>
          <Button to="/admin/products" iconLeft={<Icon name="plus" size={16} />}>
            Add product
          </Button>
        </div>
      </header>

      <section className="overview-kpis" aria-labelledby="stats-heading" aria-busy={isPending}>
        <h2 id="stats-heading" className="visually-hidden">
          Key metrics
        </h2>
        {isPending ? (
          Array.from({ length: 6 }).map((_, index) => <KpiSkeleton key={index} />)
        ) : (
          <>
            <StatCard
              label={`Revenue (${rangeLabel})`}
              value={revRange}
              delta={null}
              formatter={formatINR}
              icon="credit-card"
            />
            <StatCard
              label={`Orders (${rangeLabel})`}
              value={ordRange}
              delta={null}
              formatter={(value) => value.toLocaleString('en-IN')}
              icon="shopping-bag"
            />
            <StatCard
              label="Avg. order value"
              value={aovRange}
              delta={null}
              formatter={formatINR}
              icon="bar-chart"
            />
            <StatCard
              label="Active orders"
              value={activeOrderCount}
              formatter={(value) => value.toLocaleString('en-IN')}
              icon="truck"
            />
            <StatCard
              label="Awaiting payment"
              value={pendingOrderCount}
              formatter={(value) => value.toLocaleString('en-IN')}
              icon="alert-circle"
            />
            <StatCard
              label="Customers"
              value={customerCount}
              formatter={(value) => value.toLocaleString('en-IN')}
              icon="user"
            />
          </>
        )}
      </section>

      <div className={`overview-grid${isPlaceholderData ? ' is-placeholder' : ''}`}>
        <motion.section
          className="overview-panel overview-panel-revenue"
          aria-labelledby="chart-heading"
          {...panelMotion}
        >
          <div className="chart-controls">
            <div>
              <h2 id="chart-heading">Revenue & orders</h2>
              <p>Average order value {formatINR(aovRange)} for {rangeLabel}.</p>
            </div>
            <div className="chart-actions">
              <div className="date-range" role="group" aria-label="Date range">
                <label className="visually-hidden" htmlFor="chart-date-from">From</label>
                <input
                  id="chart-date-from"
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                />
                <label className="visually-hidden" htmlFor="chart-date-to">To</label>
                <input
                  id="chart-date-to"
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                />
                {(dateRange.from || dateRange.to) && (
                  <Button variant="outline" size="sm" onClick={() => setDateRange({ from: '', to: '' })}>
                    Clear
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportRevenueCsv}
                iconLeft={<Icon name="download" size={14} />}
              >
                Export CSV
              </Button>
              <div className="chart-tabs" role="tablist" aria-label="Chart range">
                <button
                  role="tab"
                  type="button"
                  aria-selected={seriesView === '7d'}
                  aria-controls="chart-panel"
                  className={seriesView === '7d' ? 'active' : ''}
                  onClick={() => setSeriesView('7d')}
                >
                  7 Days
                </button>
                <button
                  role="tab"
                  type="button"
                  aria-selected={seriesView === '30d'}
                  aria-controls="chart-panel"
                  className={seriesView === '30d' ? 'active' : ''}
                  onClick={() => setSeriesView('30d')}
                >
                  30 Days
                </button>
              </div>
            </div>
          </div>
          <div id="chart-panel">
            {isPending ? (
              <div className="overview-chart-skeleton" aria-hidden="true">
                <div className="skeleton" style={{ height: '250px' }} />
              </div>
            ) : error ? (
              <PanelError
                message="We could not load the revenue series."
                onRetry={refetch}
              />
            ) : (
              <BarChart
                data={chartData}
                valueKey="revenuePaise"
                labelKey="date"
                height={250}
                ariaLabel={`Revenue last ${seriesView === '7d' ? 7 : 30} days`}
                hideTitle
                flush
              />
            )}
          </div>
        </motion.section>

        <motion.section
          className="overview-panel overview-panel-distribution"
          aria-labelledby="status-heading"
          {...panelMotion}
        >
          <div className="panel-heading">
            <div>
              <h2 id="status-heading">Order status</h2>
              <p>All orders by current state.</p>
            </div>
          </div>
          {isPending ? (
            <div className="overview-loading-block" aria-hidden="true">
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : error ? (
            <PanelError message="We could not load the order breakdown." onRetry={refetch} />
          ) : (
            <DonutChart
              data={statusData}
              centerLabel="total orders"
              ariaLabel="Orders grouped by status"
            />
          )}
        </motion.section>

        <motion.section
          className="overview-panel overview-panel-bestsellers"
          aria-labelledby="products-heading"
          {...panelMotion}
        >
          <div className="panel-heading">
            <div>
              <h2 id="products-heading">Top products</h2>
              <p>Best sellers by quantity.</p>
            </div>
            <Button variant="ghost" size="sm" to="/admin/products">
              View all
              <Icon name="arrow-right" size={14} />
            </Button>
          </div>

          {isPending ? (
            <div className="overview-list-skeleton" aria-hidden="true">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="skeleton" />
              ))}
            </div>
          ) : error ? (
            <PanelError message="We could not load the best sellers." onRetry={refetch} />
          ) : topProducts.length === 0 ? (
            <p className="overview-empty">No paid orders yet.</p>
          ) : (
            <ol className="overview-product-list">
              {topProducts.map((product, index) => (
                <li key={`${product.productId || product.name}-${index}`}>
                  <span className="overview-rank">{index + 1}</span>
                  <FoodThumb src={product.imageUrl} alt={product.name} size="md" />
                  <span className="overview-product-info">
                    <strong>{product.name}</strong>
                    <span>{product.quantity} sold</span>
                  </span>
                  <strong className="overview-product-revenue">
                    {formatINR(product.revenuePaise)}
                  </strong>
                </li>
              ))}
            </ol>
          )}
        </motion.section>

        <motion.section
          className="overview-panel overview-panel-alerts"
          aria-labelledby="alerts-heading"
          {...panelMotion}
        >
          <div className="panel-heading">
            <div>
              <h2 id="alerts-heading">Operational alerts</h2>
              <p>What needs attention right now.</p>
            </div>
          </div>

          {isPending ? (
            <div className="overview-list-skeleton" aria-hidden="true">
              {[1, 2, 3].map((item) => (
                <div key={item} className="skeleton" />
              ))}
            </div>
          ) : error ? (
            <PanelError message="We could not load operational alerts." onRetry={refetch} />
          ) : alerts.length === 0 ? (
            <p className="overview-empty">Nothing needs attention. The kitchen is calm.</p>
          ) : (
            <ul className="overview-alert-list">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <Link to={alert.to} className={`overview-alert overview-alert-${alert.tone}`}>
                    <span className="overview-alert-icon" aria-hidden="true">
                      <Icon name={alert.icon} size={16} />
                    </span>
                    <span className="overview-alert-copy">
                      <strong>{alert.title}</strong>
                      <span>{alert.detail}</span>
                    </span>
                    <Icon name="arrow-right" size={14} label="" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section
          className="overview-panel overview-panel-categories"
          aria-labelledby="category-heading"
          {...panelMotion}
        >
          <div className="panel-heading">
            <div>
              <h2 id="category-heading">Revenue by category</h2>
              <p>Paid revenue split across the menu.</p>
            </div>
          </div>

          {isPending ? (
            <div className="overview-list-skeleton" aria-hidden="true">
              {[1, 2, 3].map((item) => (
                <div key={item} className="skeleton" />
              ))}
            </div>
          ) : error ? (
            <PanelError message="We could not load category revenue." onRetry={refetch} />
          ) : categoryBreakdown.length === 0 ? (
            <p className="overview-empty">No paid orders yet.</p>
          ) : (
            <ul className="overview-category-list">
              {categoryBreakdown.map((category) => (
                <li key={category.categoryId || category.name}>
                  <div className="overview-category-head">
                    <strong>{category.name}</strong>
                    <span>{formatINR(category.revenuePaise)}</span>
                  </div>
                  <div
                    className="overview-category-track"
                    role="img"
                    aria-label={`${category.name}: ${formatINR(category.revenuePaise)} from ${category.quantity} items`}
                  >
                    <span
                      style={{
                        width: `${Math.max(
                          4,
                          Math.round(((category.revenuePaise || 0) / maxCategoryRevenue) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <small>{category.quantity} items sold</small>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section
          className="overview-panel overview-panel-activity"
          aria-labelledby="activity-heading"
          {...panelMotion}
        >
          <div className="panel-heading">
            <div>
              <h2 id="activity-heading">Activity feed</h2>
              <p>Latest orders and sign-ups.</p>
            </div>
          </div>

          {isPending ? (
            <div className="overview-list-skeleton" aria-hidden="true">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="skeleton" />
              ))}
            </div>
          ) : error ? (
            <PanelError message="We could not load the activity feed." onRetry={refetch} />
          ) : activityFeed.length === 0 ? (
            <p className="overview-empty">No activity yet.</p>
          ) : (
            <ul className="overview-activity-list">
              {activityFeed.map((entry) => (
                <li key={entry.id}>
                  <Link to={entry.to} className="overview-activity-row">
                    <span className={`overview-activity-dot overview-activity-dot-${entry.tone}`} aria-hidden="true" />
                    <span className="overview-activity-copy">
                      <strong>{entry.title}</strong>
                      <span>{entry.detail}</span>
                    </span>
                    <span className="overview-activity-time">
                      {formatShortDate(entry.time)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section
          className="overview-panel overview-panel-orders"
          aria-labelledby="recent-heading"
          {...panelMotion}
        >
          <div className="section-header">
            <div>
              <h2 id="recent-heading">Recent orders</h2>
              <p>Latest orders across every channel.</p>
            </div>
            <Button variant="ghost" size="sm" to="/admin/orders">
              View all
              <Icon name="arrow-right" size={14} />
            </Button>
          </div>
          {isPending ? (
            <div className="overview-orders-skeleton" aria-hidden="true">
              <div className="skeleton" style={{ height: '16rem' }} />
            </div>
          ) : error ? (
            <PanelError message="We could not load recent orders." onRetry={refetch} />
          ) : (
            <DataTable
              className="overview-orders-table"
              columns={orderColumns}
              rows={recentOrders}
              rowKey={(row) => row.id}
              caption="Recent orders"
              empty={<p className="overview-empty">No orders yet.</p>}
            />
          )}
        </motion.section>
      </div>
    </div>
  );
}
