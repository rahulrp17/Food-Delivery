import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useUiStore } from '../../stores/ui.store';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { FilterToolbar, SearchInput, FilterSelect } from '../../components/ui/FilterToolbar';
import Pagination from '../../components/admin/Pagination';
import { TableSkeleton } from '../../components/loading';
import { formatDate } from '../../lib/format';
import { getErrorMessage } from '../../lib/validation/forms';
import './InventoryPage.css';

const REASON_TONES = {
  order: 'info',
  restock: 'success',
  adjust: 'warning',
  cancel: 'neutral',
};

const REASON_LABELS = {
  order: 'Order',
  restock: 'Restock',
  adjust: 'Adjustment',
  cancel: 'Cancellation',
};

const REASON_HINTS = {
  order: 'Stock left the kitchen when an order was paid for.',
  restock: 'Stock was added back to the catalog.',
  adjust: 'A manual correction was applied to the product.',
  cancel: 'Stock returned after an order was cancelled.',
};

const REASON_OPTIONS = [
  { value: '', label: 'All reasons' },
  { value: 'order', label: 'Order' },
  { value: 'restock', label: 'Restock' },
  { value: 'adjust', label: 'Adjustment' },
  { value: 'cancel', label: 'Cancellation' },
];

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

export default function InventoryPage() {
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useDocumentTitle('Inventory');

  const params = { q: search || undefined, reason: reason || undefined, page };

  const {
    data,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.inventory(params),
    queryFn: () => adminApi.inventory(params),
    placeholderData: keepPreviousData,
  });

  const entries = useMemo(() => data?.items || [], [data]);
  const meta = data?.meta || { total: 0, totalPages: 1 };
  const summary = data?.summary || { totalIn: 0, totalOut: 0, netChange: 0 };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await adminApi.exportInventory({
        q: search || undefined,
        reason: reason || undefined,
      });
      const disposition = response.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match?.[1] || `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showSuccess('Inventory report exported');
    } catch {
      showError('Could not export inventory');
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleReason = (value) => {
    setReason(value);
    setPage(1);
  };

  const renderBody = () => {
    if (isPending) {
      return (
        <div className="inventory-loading" aria-busy="true">
          <TableSkeleton rows={6} columns={4} />
        </div>
      );
    }

    if (error) {
      return (
        <ErrorState
          title="We could not load stock movements"
          description={getErrorMessage(error, 'The inventory request failed. Please try again.')}
          onRetry={() => refetch()}
        />
      );
    }

    if (!entries.length) {
      return (
        <EmptyState
          icon="package"
          title="No stock movements yet"
          description={
            search || reason
              ? 'No movements match the current filters. Try widening them.'
              : 'Every stock movement will be listed here as the kitchen works.'
          }
        />
      );
    }

    return (
      <ol className="movement-timeline" aria-busy={isFetching || undefined}>
        {entries.map((entry, index) => (
          <Motion.li
            key={entry.id}
            className="movement-entry"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.22,
              delay: reduceMotion ? 0 : Math.min(index, 6) * 0.03,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <span
              className={`movement-marker${entry.delta >= 0 ? ' is-in' : ' is-out'}`}
              aria-hidden="true"
            />
            <div className="movement-body">
              <div className="movement-head">
                <div className="movement-product">
                  {entry.product?.id ? (
                    <Link to="/admin/products" className="inventory-product">
                      {entry.product.name}
                    </Link>
                  ) : (
                    <span className="muted-cell">{entry.product?.name || 'Unknown product'}</span>
                  )}
                  <span className="movement-reason-hint">{REASON_HINTS[entry.reason] || ''}</span>
                </div>
                <Badge tone={entry.delta >= 0 ? 'success' : 'danger'}>
                  {entry.delta >= 0 ? '+' : ''}
                  {formatNumber(entry.delta)}
                </Badge>
              </div>

              <div className="movement-meta">
                <Badge tone={REASON_TONES[entry.reason] || 'neutral'}>
                  {REASON_LABELS[entry.reason] || entry.reason}
                </Badge>
                <span className="movement-time">
                  <Icon name="clock" size={13} label="" />
                  {formatDate(entry.createdAt)}
                </span>
                {entry.orderId ? (
                  <Link to={`/admin/orders/${entry.orderId}`} className="inventory-order">
                    View order
                  </Link>
                ) : (
                  <span className="muted-cell">No linked order</span>
                )}
              </div>
            </div>
          </Motion.li>
        ))}
      </ol>
    );
  };

  return (
    <div className="inventory-page">
      <PageHeader
        eyebrow="Operations"
        title="Inventory"
        description="Track every stock movement across the catalog."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleExport}
              loading={exporting}
              iconLeft={<Icon name="download" size={16} />}
            >
              Export CSV
            </Button>
            <Button
              variant="ghost"
              onClick={() => refetch()}
              iconLeft={<Icon name="refresh" size={16} />}
            >
              Refresh
            </Button>
            <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing movements" />
          </>
        }
      />

      <section className="inventory-summary" aria-label="Inventory summary">
        <article className="inventory-summary-card">
          <span>Stock in</span>
          <strong className="is-success">+{formatNumber(summary.totalIn)}</strong>
          <small>Units added</small>
        </article>
        <article className="inventory-summary-card">
          <span>Stock out</span>
          <strong className="is-danger">-{formatNumber(summary.totalOut)}</strong>
          <small>Units removed</small>
        </article>
        <article className="inventory-summary-card">
          <span>Net change</span>
          <strong>
            {summary.netChange >= 0 ? '+' : ''}
            {formatNumber(summary.netChange)}
          </strong>
          <small>Across matching entries</small>
        </article>
        <article className="inventory-summary-card">
          <span>Movements</span>
          <strong>{formatNumber(meta.total)}</strong>
          <small>Entries matching the filters</small>
        </article>
      </section>

      <FilterToolbar>
        <SearchInput
          id="inventory-search"
          label="Search products"
          placeholder="Search product name..."
          value={search}
          onChange={handleSearch}
        />
        <FilterSelect
          id="inventory-reason"
          label="Reason"
          value={reason}
          onChange={handleReason}
          options={REASON_OPTIONS}
        />
      </FilterToolbar>

      {renderBody()}

      {!isPending && !error && meta.totalPages > 1 ? (
        <Pagination
          page={page}
          pageCount={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
