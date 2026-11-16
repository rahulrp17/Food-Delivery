import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import DataTable from '../../components/admin/DataTable';
import CustomerAvatar from '../../components/admin/CustomerAvatar';
import Pagination from '../../components/admin/Pagination';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { formatINR, formatShortDate } from '../../lib/format';
import { CustomerStatusBadge, CustomerRoleBadge } from '../../components/admin/StatusBadge';
import { useUiStore } from '../../stores/ui.store';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { FilterToolbar, SearchInput, FilterSelect } from '../../components/ui/FilterToolbar';
import { CustomerTableSkeleton, CustomerListSkeleton, KpiSkeleton } from '../../components/loading';
import './AdminCustomers.css';
import './CustomersDirectory.css';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'last_login', label: 'Recently active' },
];

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

export default function CustomersPage() {
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('table');
  const [exporting, setExporting] = useState(false);

  useDocumentTitle('Customers');

  const params = {
    q: search || undefined,
    role: role || undefined,
    status: status || undefined,
    sort,
    page,
  };

  const {
    data,
    isPending,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.customers(params),
    queryFn: () => adminApi.customers(params),
    placeholderData: keepPreviousData,
  });

  const customers = data?.items || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };
  const summary = data?.summary || {
    total: 0,
    active: 0,
    admins: 0,
    newThisMonth: 0,
    lifetimeRevenuePaise: 0,
    returningCustomers: 0,
    returningRatePct: 0,
    avgOrderValuePaise: 0,
    paidOrders: 0,
  };
  const hasFilters = Boolean(search || role || status || sort !== 'newest');

  const clearFilters = () => {
    setSearch('');
    setRole('');
    setStatus('');
    setSort('newest');
    setPage(1);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await adminApi.exportCustomers(params);
      const blob = response.data;
      const disposition = response.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match?.[1] || `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showSuccess('Customers exported');
    } catch {
      showError('Could not export customers');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (row) => (
        <span className="cust-cell">
          <CustomerAvatar name={row.name} email={row.email} />
          <span className="cust-cell-text">
            <strong>{row.name}</strong>
            <span>{row.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '110px',
      render: (row) => (
        <span className={`cust-type-badge${row.isReturning ? ' is-returning' : ''}`}>
          {row.role === 'admin' ? 'Admin' : row.isReturning ? 'Returning' : 'New'}
        </span>
      ),
    },
    { key: 'phone', header: 'Phone', width: '120px', render: (row) => row.phone || '-' },
    {
      key: 'role',
      header: 'Role',
      width: '90px',
      render: (row) => <CustomerRoleBadge role={row.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (row) => <CustomerStatusBadge status={row.status} />,
    },
    {
      key: 'orderCount',
      header: 'Orders',
      align: 'center',
      width: '72px',
      render: (row) => formatNumber(row.orderCount),
    },
    {
      key: 'spent',
      header: 'Spent',
      align: 'right',
      width: '110px',
      render: (row) => formatINR(row.spentPaise),
    },
    {
      key: 'avgOrder',
      header: 'Avg order',
      align: 'right',
      width: '100px',
      render: (row) => formatINR(row.avgOrderPaise || 0),
    },
    {
      key: 'lastOrderAt',
      header: 'Last order',
      width: '120px',
      render: (row) =>
        row.lastOrderAt ? (
          formatShortDate(row.lastOrderAt)
        ) : (
          <span className="cust-muted">No orders</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '56px',
      render: (row) => (
        <Link
          to={`/admin/customers/${row.id}`}
          className="cust-row-action"
          aria-label={`View ${row.name}`}
        >
          <Icon name="arrow-right" size={16} label="" />
        </Link>
      ),
    },
  ];

  const cardMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: 'easeOut' },
      };

  return (
    <div className="customers-page">
      <header className="cust-hero">
        <div className="cust-hero-copy">
          <span className="cust-eyebrow">People</span>
          <h1>Customers</h1>
          <p className="page-subtitle">
            Every account, what they order and what they are worth to the kitchen.
          </p>
        </div>
        <div className="cust-hero-actions">
          <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing" />
          <span className="cust-count">
            {isPending ? '—' : `${formatNumber(meta.total)} ${meta.total === 1 ? 'account' : 'accounts'}`}
          </span>
          <Button
            variant="secondary"
            onClick={handleExport}
            loading={exporting}
            iconLeft={<Icon name="download" size={16} />}
          >
            Export CSV
          </Button>
        </div>
      </header>

      <section className="cust-summary" aria-label="Customer summary" aria-busy={isPending}>
        {isPending ? (
          Array.from({ length: 5 }).map((_, index) => <KpiSkeleton key={index} />)
        ) : (
          <>
            <article className="cust-summary-card">
              <span>Total customers</span>
              <strong>{formatNumber(summary.total)}</strong>
              <small>{formatNumber(summary.admins)} admin accounts</small>
            </article>
            <article className="cust-summary-card">
              <span>Repeat customers</span>
              <strong>{formatNumber(summary.returningCustomers)}</strong>
              <small>{summary.returningRatePct}% reorder rate</small>
            </article>
            <article className="cust-summary-card">
              <span>New this month</span>
              <strong>{formatNumber(summary.newThisMonth)}</strong>
              <small>Joined this calendar month</small>
            </article>
            <article className="cust-summary-card">
              <span>Avg. order value</span>
              <strong>{formatINR(summary.avgOrderValuePaise)}</strong>
              <small>Across {formatNumber(summary.paidOrders)} paid orders</small>
            </article>
            <article className="cust-summary-card cust-summary-card-accent">
              <span>Lifetime revenue</span>
              <strong>{formatINR(summary.lifetimeRevenuePaise)}</strong>
              <small>From paid orders</small>
            </article>
          </>
        )}
      </section>

      <FilterToolbar
        actions={
          <>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} iconLeft={<Icon name="x" size={16} />}>
                Clear
              </Button>
            )}
            <div className="cust-view-switch" role="group" aria-label="Switch customer view">
              <button
                type="button"
                className={`cust-view-btn ${view === 'table' ? 'is-active' : ''}`}
                aria-pressed={view === 'table'}
                onClick={() => setView('table')}
              >
                <Icon name="list" size={16} label="" />
                Table
              </button>
              <button
                type="button"
                className={`cust-view-btn ${view === 'cards' ? 'is-active' : ''}`}
                aria-pressed={view === 'cards'}
                onClick={() => setView('cards')}
              >
                <Icon name="layout" size={16} label="" />
                Cards
              </button>
            </div>
          </>
        }
      >
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search name, email, phone..."
          label="Search customers"
        />
        <FilterSelect
          label="Role"
          value={role}
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
          options={ROLE_OPTIONS}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Sort"
          value={sort}
          onChange={(value) => {
            setSort(value);
            setPage(1);
          }}
          options={SORT_OPTIONS}
        />
      </FilterToolbar>

      {isPending ? (
        <div aria-busy="true">
          {view === 'cards' ? (
            <CustomerListSkeleton count={6} />
          ) : (
            <CustomerTableSkeleton rows={8} />
          )}
        </div>
      ) : error ? (
        <ErrorState
          title="We could not load the customers"
          description="The customer service did not respond. Check your connection and try again."
          onRetry={refetch}
        />
      ) : customers.length === 0 ? (
        <EmptyState
          icon="user"
          title="No accounts yet"
          description={
            hasFilters
              ? 'No account matches the filters you picked. Try another search term or clear them.'
              : 'Customer accounts will appear here as soon as people register.'
          }
          actions={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : view === 'table' ? (
        <DataTable
          className={isPlaceholderData ? 'is-placeholder' : ''}
          columns={columns}
          rows={customers}
          rowKey={(row) => row.id}
          page={page}
          pageCount={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
        />
      ) : (
        <div className="cust-dir-region">
          <ul className="cust-dir-grid">
            {customers.map((customer) => (
              <motion.li key={customer.id} className="cust-dir-card" {...cardMotion}>
                <Link to={`/admin/customers/${customer.id}`} className="cust-dir-link">
                  <span className="cust-dir-head">
                    <CustomerAvatar name={customer.name} email={customer.email} size="lg" />
                    <span className="cust-dir-identity">
                      <strong>{customer.name}</strong>
                      <span>{customer.email}</span>
                    </span>
                  </span>

                  <span className="cust-dir-badges">
                    <CustomerStatusBadge status={customer.status} />
                    <CustomerRoleBadge role={customer.role} />
                    <span className={`cust-type-badge${customer.isReturning ? ' is-returning' : ''}`}>
                      {customer.isReturning ? 'Returning' : 'New'}
                    </span>
                  </span>

                  <dl className="cust-dir-stats">
                    <div>
                      <dt>Orders</dt>
                      <dd>{formatNumber(customer.orderCount)}</dd>
                    </div>
                    <div>
                      <dt>Spent</dt>
                      <dd>{formatINR(customer.spentPaise)}</dd>
                    </div>
                    <div>
                      <dt>Avg order</dt>
                      <dd>{formatINR(customer.avgOrderPaise || 0)}</dd>
                    </div>
                  </dl>

                  <span className="cust-dir-foot">
                    {customer.lastOrderAt
                      ? `Last order ${formatShortDate(customer.lastOrderAt)}`
                      : 'No orders yet'}
                    <Icon name="arrow-right" size={14} label="" />
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageCount={meta.totalPages}
            total={meta.total}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
