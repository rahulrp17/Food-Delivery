import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import { formatINR, formatDate, formatShortDate } from '../../lib/format';
import { getErrorMessage } from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { ProfileSkeleton } from '../../components/loading';
import CustomerAvatar from '../../components/admin/CustomerAvatar';
import OrderItemsPreview from '../../components/admin/OrderItemsPreview';
import {
  CustomerStatusBadge,
  CustomerRoleBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/admin/StatusBadge';
import { ConfirmDialog } from '../../components/admin/Modal';
import './AdminCustomers.css';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');

  useDocumentTitle('Customer Detail');

  const {
    data: customer,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.customer(id),
    queryFn: () => adminApi.customer(id),
    enabled: !!id,
  });

  const invalidateCustomer = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.customer(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.customers({}) });
  };

  const roleMutation = useMutation({
    mutationFn: ({ customerId, role }) => adminApi.updateCustomerRole(customerId, role),
    onSuccess: () => {
      invalidateCustomer();
      setRoleDialogOpen(false);
      showSuccess(`Role changed to ${pendingRole}`);
      setPendingRole('');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to change role'));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ customerId, status }) => adminApi.updateCustomerStatus(customerId, status),
    onSuccess: () => {
      invalidateCustomer();
      setStatusDialogOpen(false);
      showSuccess(
        pendingStatus === 'suspended' ? 'Customer account suspended' : 'Customer account reactivated'
      );
      setPendingStatus('');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to change account status'));
    },
  });

  const handleRoleChange = (newRole) => {
    setPendingRole(newRole);
    setRoleDialogOpen(true);
  };

  const confirmRoleChange = async () => {
    if (!pendingRole) return false;
    await roleMutation.mutateAsync({ customerId: id, role: pendingRole });
  };

  const handleStatusChange = (newStatus) => {
    setPendingStatus(newStatus);
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return false;
    await statusMutation.mutateAsync({ customerId: id, status: pendingStatus });
  };

  if (isPending) {
    return (
      <div className="customer-detail-page">
        <div className="detail-skeleton" aria-busy="true">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="customer-detail-page">
        <div className="detail-error-panel">
          <ErrorState
            title="Customer not found"
            description={
              error
                ? getErrorMessage(error, 'We could not load this customer. Please try again.')
                : 'This customer may have been removed, or the link is out of date.'
            }
            onRetry={() => refetch()}
          />
          <Button variant="secondary" onClick={() => navigate('/admin/customers')}>
            <Icon name="arrow-left" size={16} />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  const profile = customer.customer || customer;
  const orders = customer.orders || [];
  const isAdmin = profile.role === 'admin';
  const isSuspended = profile.status === 'suspended';

  const favouriteProducts = (() => {
    const map = new Map();
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = item.productId || item.name;
        const entry = map.get(key) || {
          name: item.name || 'Item',
          quantity: 0,
          revenuePaise: 0,
        };
        entry.quantity += item.quantity || 0;
        entry.revenuePaise +=
          item.lineTotalPaise || (item.unitPricePaise || 0) * (item.quantity || 0);
        map.set(key, entry);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenuePaise - a.revenuePaise)
      .slice(0, 5);
  })();

  return (
    <div className="customer-detail-page">
      <header className="detail-header">
        <div className="detail-header-identity">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/customers')}
            iconLeft={<Icon name="arrow-left" size={16} />}
          >
            Back to Customers
          </Button>
          <div className="detail-person">
            <CustomerAvatar name={profile.name} email={profile.email} size="lg" />
            <div>
              <h1>{profile.name}</h1>
              <p>{profile.email}</p>
            </div>
          </div>
        </div>
        <div className="detail-header-badges">
          <CustomerRoleBadge role={profile.role} />
          <CustomerStatusBadge status={profile.status} />
          {!isAdmin && (
            <span className={`customer-type-badge${profile.isReturning ? ' is-returning' : ''}`}>
              {profile.isReturning ? 'Returning customer' : 'New customer'}
            </span>
          )}
          <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing customer" />
          {!isAdmin && (
            <Button
              variant={isSuspended ? 'secondary' : 'danger'}
              size="sm"
              onClick={() => handleStatusChange(isSuspended ? 'active' : 'suspended')}
            >
              {isSuspended ? 'Reactivate account' : 'Suspend account'}
            </Button>
          )}
        </div>
      </header>

      <div className="detail-grid">
        <section className="detail-card">
          <h2>Profile</h2>
          <div className="detail-row">
            <strong>Email:</strong> {profile.email}
          </div>
          <div className="detail-row">
            <strong>Phone:</strong> {profile.phone || '-'}
          </div>
          <div className="detail-row">
            <strong>Role:</strong> <CustomerRoleBadge role={profile.role} />
          </div>
          <div className="detail-row">
            <strong>Status:</strong> <CustomerStatusBadge status={profile.status} />
          </div>
          <div className="detail-row">
            <strong>Joined:</strong> {formatShortDate(profile.createdAt)}
          </div>
          <div className="detail-row">
            <strong>Last login:</strong>{' '}
            {profile.lastLoginAt ? formatDate(profile.lastLoginAt) : 'Never'}
          </div>
        </section>

        <section className="detail-card">
          <h2>Activity</h2>
          <div className="detail-row">
            <strong>Total orders:</strong> {profile.orderCount || 0}
          </div>
          <div className="detail-row">
            <strong>Total spent:</strong> {formatINR(profile.spentPaise)}
          </div>
          <div className="detail-row">
            <strong>Last order:</strong>{' '}
            {profile.lastOrderAt ? formatDate(profile.lastOrderAt) : 'No orders yet'}
          </div>
          <div className="detail-row">
            <strong>First order:</strong>{' '}
            {profile.firstOrderAt ? formatDate(profile.firstOrderAt) : 'No orders yet'}
          </div>
          <div className="detail-row">
            <strong>Avg. order:</strong>{' '}
            {profile.avgOrderPaise
              ? formatINR(profile.avgOrderPaise)
              : profile.orderCount > 0
                ? formatINR(Math.round((profile.spentPaise || 0) / profile.orderCount))
                : formatINR(0)}
          </div>
        </section>

        <section className="detail-card">
          <h2>Favourite products</h2>
          {favouriteProducts.length === 0 ? (
            <EmptyState
              icon="shopping-bag"
              title="No purchases yet"
              description="This customer has not ordered anything, so there is no favourite product to show."
            />
          ) : (
            <div className="favourites-list">
              {favouriteProducts.map((product) => (
                <div className="favourite-row" key={product.name}>
                  <div className="favourite-main">
                    <strong>{product.name}</strong>
                    <span>{product.quantity} ordered</span>
                  </div>
                  <span className="favourite-revenue">{formatINR(product.revenuePaise)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="detail-card detail-card-full">
          <div className="section-header">
            <div>
              <h2>
                Order history ({orders.length}
                {profile.orderCount > orders.length ? ` of ${profile.orderCount}` : ''})
              </h2>
              <p>Most recent orders placed by this customer.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              to={`/admin/orders?q=${encodeURIComponent(profile.email)}`}
            >
              Find in orders
              <Icon name="arrow-right" size={14} />
            </Button>
          </div>
          {orders.length === 0 ? (
            <EmptyState
              icon="shopping-bag"
              title="No orders yet"
              description="This customer has not placed an order so far."
            />
          ) : (
            <div className="detail-table-scroll">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Items</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td data-label="Order #">{order.orderNumber}</td>
                      <td data-label="Items">
                        <OrderItemsPreview items={order.items} max={2} showNames />
                      </td>
                      <td data-label="Date">{formatShortDate(order.placedAt)}</td>
                      <td data-label="Total" style={{ textAlign: 'right' }}>
                        {formatINR(order.pricing?.totalPaise)}
                      </td>
                      <td data-label="Status">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td data-label="Payment">
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </td>
                      <td>
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="row-action"
                          aria-label={`View order ${order.orderNumber || order.id}`}
                        >
                          <Icon name="arrow-right" size={16} label="" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="detail-card detail-card-full">
          <div className="section-header">
            <div>
              <h2>Account access</h2>
              <p>Promote trusted customers or suspend abusive accounts.</p>
            </div>
          </div>
          <div className="role-change">
            <div className="role-option">
              <label className="role-radio">
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={profile.role === 'user'}
                  onChange={() => handleRoleChange('user')}
                />
                <span>Customer</span>
              </label>
            </div>
            <div className="role-option">
              <label className="role-radio">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={profile.role === 'admin'}
                  onChange={() => handleRoleChange('admin')}
                />
                <span>Administrator</span>
              </label>
            </div>
            {profile.role === 'user' && (
              <p className="role-hint">
                Promoting to admin gives full access to the admin dashboard.
              </p>
            )}
            {profile.role === 'admin' && (
              <p className="role-hint warning">
                Demoting removes admin access. You cannot demote yourself.
              </p>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        onConfirm={confirmRoleChange}
        title="Change Role"
        message={`Change role to ${pendingRole}?`}
        confirmText="Confirm"
        variant={pendingRole === 'admin' ? 'primary' : 'danger'}
        loading={roleMutation.isPending}
      />

      <ConfirmDialog
        isOpen={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={confirmStatusChange}
        title={pendingStatus === 'suspended' ? 'Suspend Account' : 'Reactivate Account'}
        message={
          pendingStatus === 'suspended'
            ? 'This customer will be signed out and blocked from placing new orders.'
            : 'This customer will be able to sign in and place orders again.'
        }
        confirmText={pendingStatus === 'suspended' ? 'Suspend' : 'Reactivate'}
        variant={pendingStatus === 'suspended' ? 'danger' : 'primary'}
        loading={statusMutation.isPending}
      />
    </div>
  );
}
