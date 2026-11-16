import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import { formatINR, formatDate } from '../../lib/format';
import {
  adminCouponFormSchema,
  focusFirstInvalidField,
  getErrorMessage,
  mapServerErrors,
  parseForm,
} from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { ConfirmDialog, FormModal, Modal } from '../../components/admin/Modal';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { FilterSelect } from '../../components/ui/FilterToolbar';
import { KpiSkeleton } from '../../components/loading';
import './CouponsPage.css';

const initialCouponForm = {
  code: '',
  description: '',
  type: 'percent',
  percentBps: 0,
  amountPaise: 0,
  maxDiscountPaise: '',
  minSubtotalPaise: 0,
  firstOrderOnly: false,
  usageLimit: '',
  perUserLimit: '',
  applicableCategoryIds: [],
  startsAt: '',
  expiresAt: '',
  isActive: true,
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'expired', label: 'Expired' },
];

const getCouponStatus = (coupon) => {
  const now = Date.now();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return 'Scheduled';
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= now) return 'Expired';
  return coupon.isActive ? 'Active' : 'Inactive';
};

const STATUS_TONE = {
  Active: 'success',
  Scheduled: 'info',
  Expired: 'neutral',
  Inactive: 'warning',
};

const discountLabel = (coupon) =>
  coupon.type === 'percent'
    ? `${((coupon.percentBps || 0) / 100).toFixed(1).replace('.0', '')}% off`
    : `${formatINR(coupon.amountPaise || 0)} off`;

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const reduceMotion = useReducedMotion();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [form, setForm] = useState(initialCouponForm);
  const [errors, setErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [redemptionCoupon, setRedemptionCoupon] = useState(null);
  const [exportingRedemptions, setExportingRedemptions] = useState(false);

  useDocumentTitle('Coupons');

  const params = { status: statusFilter || undefined };

  const {
    data,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.coupons(params),
    queryFn: () => adminApi.coupons(params),
    placeholderData: keepPreviousData,
  });

  const {
    data: redemptions,
    isPending: redemptionsPending,
    error: redemptionsError,
    refetch: refetchRedemptions,
  } = useQuery({
    queryKey: queryKeys.admin.couponRedemptions(redemptionCoupon?.id),
    queryFn: () => adminApi.couponRedemptions(redemptionCoupon.id),
    enabled: Boolean(redemptionCoupon?.id),
  });

  const coupons = data?.items || data || [];
  const totalCoupons = data?.meta?.total ?? coupons.length;

  const activeCount = coupons.filter((coupon) => getCouponStatus(coupon) === 'Active').length;
  const expiredCount = coupons.filter((coupon) => getCouponStatus(coupon) === 'Expired').length;
  const totalUses = coupons.reduce((sum, coupon) => sum + (coupon.usedCount || 0), 0);

  const createMutation = useMutation({
    mutationFn: adminApi.createCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.coupons() });
      setFormDialogOpen(false);
      resetForm();
      showSuccess('Coupon created');
    },
    onError: (createError) => {
      setErrors(mapServerErrors(createError?.details));
      showError(getErrorMessage(createError, 'Failed to create coupon'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: payload }) => adminApi.updateCoupon(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.coupons() });
      setFormDialogOpen(false);
      setEditingCoupon(null);
      resetForm();
      showSuccess('Coupon updated');
    },
    onError: (updateError) => {
      setErrors(mapServerErrors(updateError?.details));
      showError(getErrorMessage(updateError, 'Failed to update coupon'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.coupons() });
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
      showSuccess('Coupon deleted');
    },
    onError: (deleteError) => {
      showError(getErrorMessage(deleteError, 'Failed to delete coupon'));
    },
  });

  const resetForm = () => {
    setForm(initialCouponForm);
    setEditingCoupon(null);
    setErrors({});
  };

  const handleOpenCreate = () => {
    resetForm();
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      type: coupon.type,
      percentBps: coupon.percentBps || 0,
      amountPaise: coupon.amountPaise || 0,
      maxDiscountPaise: coupon.maxDiscountPaise || '',
      minSubtotalPaise: coupon.minSubtotalPaise || 0,
      firstOrderOnly: coupon.firstOrderOnly === true,
      usageLimit: coupon.usageLimit || '',
      perUserLimit: coupon.perUserLimit || '',
      applicableCategoryIds: coupon.applicableCategoryIds || [],
      startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : '',
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : '',
      isActive: coupon.isActive !== false,
    });
    setErrors({});
    setFormDialogOpen(true);
  };

  const handleDelete = (coupon) => {
    setCouponToDelete(coupon);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseForm(adminCouponFormSchema, form);
    if (!parsed.success) {
      setErrors(parsed.errors);
      focusFirstInvalidField();
      return false;
    }

    setErrors({});
    const data = parsed.data;
    const payload = {
      code: data.code.toUpperCase(),
      description: data.description || undefined,
      type: data.type,
      percentBps: data.type === 'percent' ? data.percentBps : 0,
      amountPaise: data.type === 'fixed' ? data.amountPaise : 0,
      maxDiscountPaise: data.type === 'percent' ? data.maxDiscountPaise ?? null : null,
      minSubtotalPaise: data.minSubtotalPaise,
      firstOrderOnly: data.firstOrderOnly,
      usageLimit: data.usageLimit ?? null,
      perUserLimit: data.perUserLimit ?? null,
      applicableCategoryIds: form.applicableCategoryIds,
      startsAt: data.startsAt || undefined,
      expiresAt: data.expiresAt || undefined,
      isActive: data.isActive,
    };
    if (editingCoupon) {
      await updateMutation.mutateAsync({ id: editingCoupon.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;
    await deleteMutation.mutateAsync(couponToDelete.id);
  };

  const handleExportRedemptions = async () => {
    if (!redemptionCoupon || exportingRedemptions) return;
    setExportingRedemptions(true);
    try {
      const response = await adminApi.exportCouponRedemptions(redemptionCoupon.id);
      const disposition = response.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match?.[1] || `coupon-${redemptionCoupon.code}-redemptions.csv`;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showSuccess('Redemptions exported');
    } catch {
      showError('Could not export redemptions');
    } finally {
      setExportingRedemptions(false);
    }
  };

  const cardMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24, ease: 'easeOut' },
      };

  return (
    <div className="coupons-page">
      <header className="coupons-header">
        <div className="coupons-header-copy">
          <span className="coupons-eyebrow">Promotions</span>
          <h1>Coupons</h1>
          <p className="page-subtitle">
            Create discount codes, watch how they perform, and keep the offers shelf-ready.
          </p>
        </div>
        <div className="coupons-header-actions">
          <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing" />
          <Button onClick={handleOpenCreate} iconLeft={<Icon name="plus" size={18} />}>
            New Coupon
          </Button>
        </div>
      </header>

      <section className="coupons-summary" aria-label="Coupon summary" aria-busy={isPending}>
        {isPending ? (
          Array.from({ length: 4 }).map((_, index) => <KpiSkeleton key={index} />)
        ) : (
          <>
            <article className="coupons-summary-card">
              <span>Total coupons</span>
              <strong>{totalCoupons.toLocaleString('en-IN')}</strong>
              <small>Matching the current filter</small>
            </article>
            <article className="coupons-summary-card">
              <span>Active</span>
              <strong>{activeCount}</strong>
              <small>Redeemable right now</small>
            </article>
            <article className="coupons-summary-card">
              <span>Expired</span>
              <strong>{expiredCount}</strong>
              <small>No longer redeemable</small>
            </article>
            <article className="coupons-summary-card coupons-summary-card-accent">
              <span>Total redemptions</span>
              <strong>{totalUses.toLocaleString('en-IN')}</strong>
              <small>Across the loaded coupons</small>
            </article>
          </>
        )}
      </section>

      <div className="coupons-toolbar">
        <FilterSelect
          id="coupon-status"
          label="Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={STATUS_OPTIONS}
        />
      </div>

      {isPending ? (
        <div className="coupons-summary-skeleton" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="coupon-card-skeleton" aria-hidden="true">
              <span className="skeleton coupon-skeleton-pill" />
              <span className="skeleton coupon-skeleton-value" />
              <span className="skeleton coupon-skeleton-line" />
              <span className="skeleton coupon-skeleton-line is-short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          headingLevel="h2"
          title="We could not load the coupons"
          description="The promotion service did not respond. Check your connection and try again."
          onRetry={refetch}
        />
      ) : coupons.length === 0 ? (
        <EmptyState
          icon="ticket"
          headingLevel="h2"
          title={statusFilter ? 'No promotions in this state' : 'No promotions yet'}
          description={
            statusFilter
              ? 'Try another status filter to see the rest of your promotions.'
              : 'Create a discount code to reward customers and lift order value.'
          }
          actions={
            statusFilter ? (
              <Button variant="secondary" onClick={() => setStatusFilter('')}>
                Show all statuses
              </Button>
            ) : (
              <Button onClick={handleOpenCreate} iconLeft={<Icon name="plus" size={16} />}>
                Create your first coupon
              </Button>
            )
          }
        />
      ) : (
        <ul className="coupons-grid">
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            const usagePercent =
              coupon.usageLimit > 0
                ? Math.min(100, Math.round(((coupon.usedCount || 0) / coupon.usageLimit) * 100))
                : null;
            return (
              <motion.li key={coupon.id} className="coupon-card" {...cardMotion}>
                <div className="coupon-card-main">
                  <div className="coupon-card-head">
                    <code className="coupon-code">{coupon.code}</code>
                    <span className={`coupon-status coupon-status-${status.toLowerCase()}`}>
                      {status}
                    </span>
                  </div>

                  <p className="coupon-value">{discountLabel(coupon)}</p>
                  {coupon.description ? (
                    <p className="coupon-description">{coupon.description}</p>
                  ) : null}

                  <dl className="coupon-terms">
                    <div>
                      <dt>Min. order</dt>
                      <dd>{formatINR(coupon.minSubtotalPaise || 0)}</dd>
                    </div>
                    <div>
                      <dt>Expires</dt>
                      <dd>{coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Never'}</dd>
                    </div>
                    <div>
                      <dt>Per user</dt>
                      <dd>{coupon.perUserLimit || '∞'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="coupon-card-side">
                  <span className="coupon-uses">{coupon.usedCount || 0} uses</span>
                  <span className="coupon-redeemed">
                    {formatINR(coupon.discountRedeemedPaise || 0)} redeemed
                  </span>
                  {usagePercent !== null ? (
                    <span className="coupon-usage-track" aria-hidden="true">
                      <span style={{ width: `${usagePercent}%` }} />
                    </span>
                  ) : null}
                  {coupon.firstOrderOnly ? (
                    <span className="coupon-tag">First order only</span>
                  ) : null}
                </div>

                <div className="coupon-card-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    title="View redemptions"
                    aria-label={`View redemptions for ${coupon.code}`}
                    onClick={() => setRedemptionCoupon(coupon)}
                  >
                    <Icon name="eye" size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Edit"
                    aria-label={`Edit coupon ${coupon.code}`}
                    onClick={() => handleOpenEdit(coupon)}
                  >
                    <Icon name="pencil" size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Delete"
                    aria-label={`Delete coupon ${coupon.code}`}
                    onClick={() => handleDelete(coupon)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      <FormModal
        isOpen={formDialogOpen}
        onClose={() => {
          setFormDialogOpen(false);
          resetForm();
        }}
        onSubmit={handleSubmit}
        title={editingCoupon ? 'Edit Coupon' : 'New Coupon'}
        submitText="Save"
        loading={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="modal-form-body">
          <div className="form-field">
            <label htmlFor="coupon-code">Code *</label>
            <Input
              id="coupon-code"
              name="code"
              value={form.code}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }));
                if (errors.code) setErrors((prev) => ({ ...prev, code: null }));
              }}
              placeholder="SAVE20"
              error={errors.code}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="coupon-desc">Description</label>
            <Input
              id="coupon-desc"
              name="description"
              value={form.description}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, description: e.target.value }));
                if (errors.description) setErrors((prev) => ({ ...prev, description: null }));
              }}
              placeholder="Description for internal use"
              error={errors.description}
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="coupon-type">Type *</label>
              <select
                id="coupon-type"
                value={form.type}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, type: e.target.value }));
                  setErrors((prev) => ({ ...prev, percentBps: null, amountPaise: null, maxDiscountPaise: null }));
                }}
                className="select-input"
              >
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="coupon-value">Value *</label>
              {form.type === 'percent' ? (
                <Input
                  id="coupon-value"
                  name="percentBps"
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={form.percentBps}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, percentBps: parseInt(e.target.value, 10) || 0 }));
                    if (errors.percentBps) setErrors((prev) => ({ ...prev, percentBps: null }));
                  }}
                  placeholder="1000 = 10%"
                  hint="Percentage in basis points (1000 = 10%)"
                  error={errors.percentBps}
                />
              ) : (
                <Input
                  id="coupon-value"
                  name="amountPaise"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amountPaise ? (form.amountPaise / 100).toFixed(2) : ''}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      amountPaise: Math.round(parseFloat(e.target.value || 0) * 100),
                    }));
                    if (errors.amountPaise) setErrors((prev) => ({ ...prev, amountPaise: null }));
                  }}
                  placeholder="249.00"
                  hint="Amount in ₹"
                  error={errors.amountPaise}
                />
              )}
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="coupon-max-discount">Max Discount (₹)</label>
            <Input
              id="coupon-max-discount"
              name="maxDiscountPaise"
              type="number"
              step="0.01"
              min="0"
              value={form.maxDiscountPaise ? (form.maxDiscountPaise / 100).toFixed(2) : ''}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  maxDiscountPaise:
                    e.target.value === '' ? '' : Math.round(parseFloat(e.target.value || 0) * 100),
                }));
                if (errors.maxDiscountPaise) {
                  setErrors((prev) => ({ ...prev, maxDiscountPaise: null }));
                }
              }}
              placeholder="500.00"
              hint="Cap for percentage coupons"
              error={errors.maxDiscountPaise}
            />
          </div>
          <div className="form-field">
            <label htmlFor="coupon-min-sub">Min Subtotal (₹)</label>
            <Input
              id="coupon-min-sub"
              name="minSubtotalPaise"
              type="number"
              step="0.01"
              min="0"
              value={form.minSubtotalPaise ? (form.minSubtotalPaise / 100).toFixed(2) : ''}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  minSubtotalPaise: Math.round(parseFloat(e.target.value || 0) * 100),
                }));
                if (errors.minSubtotalPaise) {
                  setErrors((prev) => ({ ...prev, minSubtotalPaise: null }));
                }
              }}
              placeholder="0.00"
              error={errors.minSubtotalPaise}
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={form.firstOrderOnly}
                  onChange={(e) => setForm((prev) => ({ ...prev, firstOrderOnly: e.target.checked }))}
                />
                <span>First Order Only</span>
              </label>
            </div>
            <div className="form-field">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <span>Active</span>
              </label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="coupon-usage-limit">Usage Limit</label>
              <Input
                id="coupon-usage-limit"
                name="usageLimit"
                type="number"
                min="1"
                value={form.usageLimit}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, usageLimit: e.target.value }));
                  if (errors.usageLimit) setErrors((prev) => ({ ...prev, usageLimit: null }));
                }}
                placeholder="100"
                hint="Leave blank for unlimited"
                error={errors.usageLimit}
              />
            </div>
            <div className="form-field">
              <label htmlFor="coupon-per-user">Per User Limit</label>
              <Input
                id="coupon-per-user"
                name="perUserLimit"
                type="number"
                min="1"
                value={form.perUserLimit}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, perUserLimit: e.target.value }));
                  if (errors.perUserLimit) setErrors((prev) => ({ ...prev, perUserLimit: null }));
                }}
                placeholder="1"
                error={errors.perUserLimit}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="coupon-starts">Starts At</label>
              <Input
                id="coupon-starts"
                name="startsAt"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, startsAt: e.target.value }));
                  if (errors.startsAt) setErrors((prev) => ({ ...prev, startsAt: null }));
                }}
                error={errors.startsAt}
              />
            </div>
            <div className="form-field">
              <label htmlFor="coupon-expires">Expires At</label>
              <Input
                id="coupon-expires"
                name="expiresAt"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, expiresAt: e.target.value }));
                  if (errors.expiresAt) setErrors((prev) => ({ ...prev, expiresAt: null }));
                }}
                error={errors.expiresAt}
              />
            </div>
          </div>
        </div>
      </FormModal>

      <Modal
        isOpen={Boolean(redemptionCoupon)}
        onClose={() => setRedemptionCoupon(null)}
        title={redemptionCoupon ? `Redemptions — ${redemptionCoupon.code}` : 'Redemptions'}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={handleExportRedemptions}
              loading={exportingRedemptions}
              iconLeft={<Icon name="download" size={16} />}
            >
              Export CSV
            </Button>
            <Button variant="ghost" onClick={() => setRedemptionCoupon(null)}>
              Close
            </Button>
          </>
        }
      >
        {redemptionsPending ? (
          <div className="redemption-loading" aria-busy="true">
            <span className="skeleton redemption-loading-line" />
            <span className="skeleton redemption-loading-line" />
            <span className="skeleton redemption-loading-line" />
          </div>
        ) : redemptionsError ? (
          <div className="redemption-error" role="alert">
            <p>Could not load redemptions for this coupon.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetchRedemptions()}
              iconLeft={<Icon name="refresh" size={16} />}
            >
              Retry
            </Button>
          </div>
        ) : (redemptions?.items || []).length === 0 ? (
          <p className="redemption-empty">No orders have used this coupon yet.</p>
        ) : (
          <div className="redemptions-scroll">
            <p className="redemption-summary">
              {redemptions.total} {redemptions.total === 1 ? 'redemption' : 'redemptions'}
            </p>
            <table className="redemptions-table">
              <caption className="visually-hidden">
                Orders that redeemed {redemptionCoupon?.code}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Order #</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Date</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Order total
                  </th>
                </tr>
              </thead>
              <tbody>
                {redemptions.items.map((row) => (
                  <tr key={`${row.orderNumber}-${row.createdAt}`}>
                    <td>{row.orderNumber || '-'}</td>
                    <td>
                      <span className="redemption-customer">
                        <strong>{row.userName || 'Customer'}</strong>
                        <span>{row.userEmail}</span>
                      </span>
                    </td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(row.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCouponToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Coupon"
        message={couponToDelete ? `Delete coupon "${couponToDelete.code}"?` : ''}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
