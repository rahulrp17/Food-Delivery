import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { userApi } from '../../api/user.api';
import { ordersApi } from '../../api/orders.api';
import { reviewsApi } from '../../api/reviews.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import { useUiStore } from '../../stores/ui.store';
import { formatDate, formatINR } from '../../lib/format';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS, isActiveOrder } from '../../lib/orders';
import {
  addressFormSchema,
  changePasswordFormSchema,
  focusFirstInvalidField,
  getErrorMessage,
  mapServerErrors,
  parseForm,
  profileFormSchema,
} from '../../lib/validation/forms';
import './AccountPage.css';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'layout' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'addresses', label: 'Addresses', icon: 'map-pin' },
    { id: 'wishlist', label: 'Wishlist', icon: 'heart' },
    { id: 'reviews', label: 'My reviews', icon: 'star' },
    { id: 'security', label: 'Security', icon: 'shield-check' },
  ];

const emptyAddressForm = {
  label: 'Home',
  recipientName: '',
  phone: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'A';

const formatMemberSince = (dateString) => {
  if (!dateString) return 'Recently joined';
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return 'Recently joined';
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(date);
};

const getOrderItemCount = (order) =>
  order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

const AccountSkeleton = () => (
  <div className="account-page" aria-busy="true">
    <div className="account-heading">
      <div>
        <div className="skeleton skeleton-line skeleton-line-sm" />
        <div className="skeleton skeleton-line skeleton-line-lg" />
        <div className="skeleton skeleton-line skeleton-line-md" />
      </div>
    </div>
    <div className="account-layout">
      <div className="account-sidebar account-sidebar-skeleton">
        <div className="skeleton skeleton-avatar" />
        <div className="skeleton skeleton-line skeleton-line-md" />
        <div className="skeleton skeleton-line skeleton-line-sm" />
        <div className="skeleton skeleton-line skeleton-line-lg" />
        <div className="skeleton skeleton-line skeleton-line-lg" />
        <div className="skeleton skeleton-line skeleton-line-lg" />
      </div>
      <div className="account-main">
        <div className="skeleton skeleton-hero" />
        <div className="account-stats">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="skeleton skeleton-stat" />
          ))}
        </div>
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  </div>
);

const RecentOrder = ({ order }) => (
  <Link to={`/orders/${order.id}`} className="recent-order">
    <div className="recent-order-body">
      <div className="recent-order-top">
        <span className="recent-order-number">#{order.id.slice(-8).toUpperCase()}</span>
        <Badge tone={ORDER_STATUS_VARIANTS[order.status] || 'neutral'}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </Badge>
      </div>
      <span className="recent-order-date">{formatDate(order.placedAt)}</span>
      <div className="recent-order-items">
        {(order.items || []).slice(0, 3).map((item, index) => (
          <span className="recent-order-thumb" key={`${item.productId || item.name}-${index}`}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" loading="lazy" />
            ) : (
              <Icon name="chef-hat" size={15} />
            )}
          </span>
        ))}
        {(order.items?.length || 0) > 3 ? (
          <span className="recent-order-more">+{order.items.length - 3}</span>
        ) : null}
      </div>
    </div>
    <div className="recent-order-side">
      <strong>{formatINR(order.pricing?.totalPaise || 0)}</strong>
      <span>{getOrderItemCount(order)} {getOrderItemCount(order) === 1 ? 'item' : 'items'}</span>
      <Icon name="chevron-right" size={17} />
    </div>
  </Link>
);

export default function AccountPage() {
  const reduceMotion = useReducedMotion();
  useDocumentTitle('My account');
  const { user, updateProfile, updatePassword, isAuthenticated } = useAuth();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);

  const [activeSection, setActiveSection] = useState('overview');
  const [profileData, setProfileData] = useState({ name: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [ordersError, setOrdersError] = useState(null);
  const [addressesError, setAddressesError] = useState(null);
  const [wishlistError, setWishlistError] = useState(null);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const [profileErrors, setProfileErrors] = useState({});
  const [addressErrors, setAddressErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [deleteAddressId, setDeleteAddressId] = useState(null);
  const [busyAddressId, setBusyAddressId] = useState(null);
  const [busyWishlistId, setBusyWishlistId] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [passwordData, setPasswordData] = useState(emptyPasswordForm);

  const loadUserData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    setLoadError(null);
    setOrdersError(null);
    setAddressesError(null);
    setWishlistError(null);

    const [addressResult, wishlistResult, ordersResult] = await Promise.allSettled([
      userApi.listAddresses(),
      userApi.listWishlist(),
      ordersApi.list({ page: 1, limit: 4 }),
    ]);

    if (addressResult.status === 'fulfilled') {
      setAddresses(addressResult.value?.addresses || []);
    } else {
      setAddressesError(getErrorMessage(addressResult.reason, 'Failed to load saved addresses'));
    }

    if (wishlistResult.status === 'fulfilled') {
      setWishlist(wishlistResult.value?.items || []);
    } else {
      setWishlistError(getErrorMessage(wishlistResult.reason, 'Failed to load wishlist'));
    }

    if (ordersResult.status === 'fulfilled') {
      setRecentOrders(ordersResult.value?.items || []);
      setTotalOrders(ordersResult.value?.meta?.total ?? ordersResult.value?.items?.length ?? 0);
    } else {
      setOrdersError(getErrorMessage(ordersResult.reason, 'Failed to load recent orders'));
    }

    const failures = [addressResult, wishlistResult, ordersResult].filter(
      (result) => result.status === 'rejected'
    );

    if (failures.length === 3) {
      setLoadError('We could not load your account data right now.');
    } else if (failures.length > 0) {
      showError('Some account information could not be loaded');
    }

    if (!silent) setIsLoading(false);
  }, [showError]);

  useEffect(() => {
    if (isAuthenticated) loadUserData();
  }, [isAuthenticated, loadUserData]);

  const loadMyReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    setReviewsError(null);
    try {
      const result = await reviewsApi.mine({ limit: 20 });
      setMyReviews(result?.items || []);
    } catch (error) {
      setReviewsError(getErrorMessage(error, 'Failed to load your reviews'));
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadMyReviews();
  }, [isAuthenticated, loadMyReviews]);

  useEffect(() => {
    if (!user) return;
    setProfileData({ name: user.name || '', phone: user.phone || '' });
  }, [user]);

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';
  const memberSince = formatMemberSince(user?.createdAt);
  const activeOrders = useMemo(
    () => recentOrders.filter((order) => isActiveOrder(order.status)).length,
    [recentOrders]
  );

  const handleProfileChange = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseForm(profileFormSchema, profileData);
    if (!parsed.success) {
      setProfileErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }

    setSavingProfile(true);
    try {
      const result = await updateProfile(parsed.data);
      if (!result.success) {
        const fieldErrors = mapServerErrors(result.details, ['name', 'phone']);
        if (Object.keys(fieldErrors).length > 0) {
          setProfileErrors(fieldErrors);
          focusFirstInvalidField();
        }
        return;
      }
      setProfileErrors({});
      setProfileData({ name: result.user?.name || parsed.data.name, phone: result.user?.phone || '' });
      showSuccess('Profile updated');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddressChange = (field, value) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
    if (addressErrors[field]) {
      setAddressErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const openAddressForm = () => {
    setAddressForm(emptyAddressForm);
    setEditingAddressId(null);
    setAddressErrors({});
    setShowAddressForm(true);
  };

  const handleEditAddress = (address) => {
    setAddressForm({
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || '',
      landmark: address.landmark || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    });
    setEditingAddressId(address.id);
    setAddressErrors({});
    setShowAddressForm(true);
    window.requestAnimationFrame(() => {
      document.getElementById('address-recipientName')?.focus();
    });
  };

  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressErrors({});
    setAddressForm(emptyAddressForm);
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseForm(addressFormSchema, addressForm);
    if (!parsed.success) {
      setAddressErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }

    setSavingAddress(true);
    try {
      if (editingAddressId) {
        await userApi.updateAddress(editingAddressId, parsed.data);
        showSuccess('Address updated');
      } else {
        await userApi.createAddress(parsed.data);
        showSuccess('Address added');
      }
      closeAddressForm();
      await loadUserData({ silent: true });
    } catch (error) {
      const fieldErrors = mapServerErrors(error?.details, [
        'label', 'recipientName', 'phone', 'line1', 'line2', 'landmark',
        'city', 'state', 'pincode', 'isDefault',
      ]);
      if (Object.keys(fieldErrors).length > 0) {
        setAddressErrors(fieldErrors);
        focusFirstInvalidField();
      }
      showError(getErrorMessage(error, editingAddressId ? 'Failed to update address' : 'Failed to add address'));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    setBusyAddressId(id);
    try {
      await userApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((address) => address.id !== id));
      setDeleteAddressId(null);
      showSuccess('Address deleted');
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to delete address'));
    } finally {
      setBusyAddressId(null);
    }
  };

  const handleSetDefault = async (id) => {
    const address = addresses.find((item) => item.id === id);
    if (!address) return;
    setBusyAddressId(id);
    try {
      await userApi.updateAddress(id, { ...address, isDefault: true });
      setAddresses((prev) =>
        prev.map((item) => ({ ...item, isDefault: item.id === id }))
      );
      showSuccess('Default address updated');
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to set default address'));
    } finally {
      setBusyAddressId(null);
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseForm(changePasswordFormSchema, passwordData);
    if (!parsed.success) {
      setPasswordErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }

    setSavingPassword(true);
    try {
      const result = await updatePassword(
        parsed.data.currentPassword,
        parsed.data.newPassword
      );
      if (!result.success) {
        const fieldErrors = mapServerErrors(result.details, [
          'currentPassword', 'newPassword', 'confirmPassword',
        ]);
        if (Object.keys(fieldErrors).length > 0) {
          setPasswordErrors(fieldErrors);
          focusFirstInvalidField();
        }
        return;
      }
      setPasswordData(emptyPasswordForm);
      setPasswordErrors({});
      showSuccess('Password updated');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRemoveWishlist = async (productId) => {
    setBusyWishlistId(productId);
    try {
      await userApi.removeFromWishlist(productId);
      setWishlist((prev) => prev.filter((product) => product.id !== productId));
      showSuccess('Removed from wishlist');
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to remove item from wishlist'));
    } finally {
      setBusyWishlistId(null);
    }
  };

  if (isLoading) return <AccountSkeleton />;

  const renderOverview = () => (
    <>
      <section className="account-welcome">
        <div>
          <span className="account-welcome-eyebrow">
            <Icon name="sparkles" size={15} />
            Member since {memberSince}
          </span>
          <h2>Good to see you, {firstName}</h2>
          <p>
            Track orders, manage delivery details, and keep your favourite dishes close.
          </p>
          <div className="account-welcome-actions">
            <Button to="/orders" iconRight={<Icon name="arrow-right" size={17} />}>
              View my orders
            </Button>
            <Button to="/menu" variant="secondary">
              Browse the menu
            </Button>
          </div>
        </div>
        <div className="account-welcome-avatar" aria-hidden="true">
          {getInitials(user?.name)}
        </div>
      </section>

      <div className="account-stats">
        <Link to="/orders" className="account-stat">
          <span className="account-stat-icon"><Icon name="package" size={20} /></span>
          <span className="account-stat-value">{totalOrders}</span>
          <span className="account-stat-label">Total orders</span>
          <span className="account-stat-note">
            {activeOrders > 0 ? `${activeOrders} active now` : 'All caught up'}
          </span>
        </Link>
        <button
          type="button"
          className="account-stat"
          onClick={() => setActiveSection('addresses')}
        >
          <span className="account-stat-icon"><Icon name="map-pin" size={20} /></span>
          <span className="account-stat-value">{addresses.length}</span>
          <span className="account-stat-label">Saved addresses</span>
          <span className="account-stat-note">Faster checkout</span>
        </button>
        <button
          type="button"
          className="account-stat"
          onClick={() => setActiveSection('wishlist')}
        >
          <span className="account-stat-icon"><Icon name="heart" size={20} /></span>
          <span className="account-stat-value">{wishlist.length}</span>
          <span className="account-stat-label">Wishlist</span>
          <span className="account-stat-note">Saved for later</span>
        </button>
        <div className="account-stat account-stat-static">
          <span className="account-stat-icon"><Icon name="shield-check" size={20} /></span>
          <span className="account-stat-value account-stat-value-sm">{memberSince}</span>
          <span className="account-stat-label">Member since</span>
          <span className="account-stat-note">Foodie family</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-card dashboard-orders">
          <div className="dashboard-card-head">
            <div>
              <h3>Recent orders</h3>
              <p>Your latest kitchen moments</p>
            </div>
            <Link to="/orders" className="dashboard-card-link">
              View all <Icon name="arrow-right" size={15} />
            </Link>
          </div>

          {ordersError ? (
            <div className="account-inline-error" role="alert">
              <Icon name="alert-circle" size={18} />
              <span>{ordersError}</span>
              <Button variant="outline" size="sm" onClick={loadUserData}>
                Retry
              </Button>
            </div>
          ) : recentOrders.length === 0 ? (
            <EmptyState
              icon="package"
              title="No orders yet"
              description="Your first order will show up here."
              actions={<Button to="/menu">Explore the menu</Button>}
            />
          ) : (
            <div className="recent-orders">
              {recentOrders.map((order) => (
                <RecentOrder key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>

        <aside className="dashboard-side">
          <section className="dashboard-card account-profile-card">
            <div className="dashboard-card-head">
              <div>
                <h3>Your details</h3>
                <p>How we reach you</p>
              </div>
              <button
                type="button"
                className="dashboard-card-link"
                onClick={() => setActiveSection('profile')}
              >
                Edit <Icon name="pencil" size={14} />
              </button>
            </div>
            <div className="profile-summary">
              <span className="profile-summary-avatar" aria-hidden="true">
                {getInitials(user?.name)}
              </span>
              <div>
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
                <span>{user?.phone || 'No phone added yet'}</span>
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <div className="dashboard-card-head">
              <div>
                <h3>Quick actions</h3>
                <p>Shortcuts that save time</p>
              </div>
            </div>
            <div className="quick-actions">
              <Link to="/orders" className="quick-action">
                <Icon name="package" size={18} />
                <span>Track orders</span>
                <Icon name="chevron-right" size={16} />
              </Link>
              <button type="button" className="quick-action" onClick={() => setActiveSection('addresses')}>
                <Icon name="map-pin" size={18} />
                <span>Manage addresses</span>
                <Icon name="chevron-right" size={16} />
              </button>
              <Link to="/menu" className="quick-action">
                <Icon name="chef-hat" size={18} />
                <span>Order something new</span>
                <Icon name="chevron-right" size={16} />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </>
  );

  const renderProfile = () => (
    <section className="account-panel">
      <div className="account-panel-head">
        <div>
          <span className="panel-eyebrow">Personal information</span>
          <h2>Profile details</h2>
          <p>Keep your contact information up to date.</p>
        </div>
      </div>
      <form onSubmit={handleProfileSubmit} className="account-form" noValidate>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="account-name">Full name</label>
            <Input
              id="account-name"
              name="name"
              value={profileData.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
              placeholder="Your name"
              error={profileErrors.name}
              autoComplete="name"
              disabled={savingProfile}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="account-email">Email</label>
            <Input
              id="account-email"
              name="email"
              type="email"
              value={user?.email || ''}
              disabled
              placeholder="your@email.com"
            />
            <p className="field-hint">Email cannot be changed</p>
          </div>
          <div className="form-field">
            <label htmlFor="account-phone">Phone</label>
            <Input
              id="account-phone"
              name="phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
              placeholder="+91 98765 43210"
              error={profileErrors.phone}
              autoComplete="tel"
              disabled={savingProfile}
            />
          </div>
        </div>
        <div className="form-actions">
          <Button type="submit" size="lg" loading={savingProfile}>
            Save changes
          </Button>
        </div>
      </form>
    </section>
  );

  const renderAddresses = () => (
    <section className="account-panel">
      <div className="account-panel-head">
        <div>
          <span className="panel-eyebrow">Delivery</span>
          <h2>Saved addresses</h2>
          <p>Choose where your next order should arrive.</p>
        </div>
        <Button onClick={openAddressForm} iconLeft={<Icon name="plus" size={17} />}>
          Add address
        </Button>
      </div>

      {addressesError ? (
        <div className="account-inline-error" role="alert">
          <Icon name="alert-circle" size={18} />
          <span>{addressesError}</span>
          <Button variant="outline" size="sm" onClick={loadUserData}>Retry</Button>
        </div>
      ) : null}

      {showAddressForm ? (
        <form onSubmit={handleAddressSubmit} className="address-form" noValidate>
          <div className="address-form-head">
            <h3>{editingAddressId ? 'Edit address' : 'Add a new address'}</h3>
            <button type="button" className="address-form-cancel" onClick={closeAddressForm}>
              Cancel
            </button>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="address-label">Label</label>
              <select
                id="address-label"
                value={addressForm.label}
                onChange={(e) => handleAddressChange('label', e.target.value)}
                className={`form-select ${addressErrors.label ? 'has-error' : ''}`.trim()}
                aria-invalid={addressErrors.label ? 'true' : undefined}
                disabled={savingAddress}
              >
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
              {addressErrors.label ? <p className="field-error" role="alert">{addressErrors.label}</p> : null}
            </div>
            <div className="form-field">
              <label htmlFor="address-recipientName">Recipient name</label>
              <Input
                id="address-recipientName"
                name="recipientName"
                value={addressForm.recipientName}
                onChange={(e) => handleAddressChange('recipientName', e.target.value)}
                placeholder="Full name"
                error={addressErrors.recipientName}
                autoComplete="name"
                disabled={savingAddress}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="address-phone">Phone</label>
              <Input
                id="address-phone"
                name="addressPhone"
                type="tel"
                value={addressForm.phone}
                onChange={(e) => handleAddressChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                error={addressErrors.phone}
                autoComplete="tel"
                disabled={savingAddress}
                required
              />
            </div>
            <div className="form-field full-width">
              <label htmlFor="address-line1">Address line 1</label>
              <Input
                id="address-line1"
                name="line1"
                value={addressForm.line1}
                onChange={(e) => handleAddressChange('line1', e.target.value)}
                placeholder="House, building, apartment"
                error={addressErrors.line1}
                autoComplete="address-line1"
                disabled={savingAddress}
                required
              />
            </div>
            <div className="form-field full-width">
              <label htmlFor="address-line2">Address line 2</label>
              <Input
                id="address-line2"
                name="line2"
                value={addressForm.line2}
                onChange={(e) => handleAddressChange('line2', e.target.value)}
                placeholder="Area or street (optional)"
                error={addressErrors.line2}
                autoComplete="address-line2"
                disabled={savingAddress}
              />
            </div>
            <div className="form-field full-width">
              <label htmlFor="address-landmark">Landmark</label>
              <Input
                id="address-landmark"
                name="landmark"
                value={addressForm.landmark}
                onChange={(e) => handleAddressChange('landmark', e.target.value)}
                placeholder="Nearby landmark (optional)"
                error={addressErrors.landmark}
                disabled={savingAddress}
              />
            </div>
            <div className="form-field">
              <label htmlFor="address-city">City</label>
              <Input
                id="address-city"
                name="city"
                value={addressForm.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder="City"
                error={addressErrors.city}
                autoComplete="address-level2"
                disabled={savingAddress}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="address-state">State</label>
              <Input
                id="address-state"
                name="state"
                value={addressForm.state}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                placeholder="State"
                error={addressErrors.state}
                autoComplete="address-level1"
                disabled={savingAddress}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="address-pincode">PIN code</label>
              <Input
                id="address-pincode"
                name="pincode"
                value={addressForm.pincode}
                onChange={(e) => handleAddressChange('pincode', e.target.value)}
                placeholder="6-digit PIN"
                error={addressErrors.pincode}
                inputMode="numeric"
                maxLength={6}
                autoComplete="postal-code"
                disabled={savingAddress}
                required
              />
            </div>
            <div className="form-field full-width">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => handleAddressChange('isDefault', e.target.checked)}
                  disabled={savingAddress}
                />
                Set as default address
              </label>
            </div>
          </div>
          <div className="form-actions">
            <Button type="button" variant="outline" onClick={closeAddressForm} disabled={savingAddress}>
              Cancel
            </Button>
            <Button type="submit" size="lg" loading={savingAddress}>
              {editingAddressId ? 'Update address' : 'Save address'}
            </Button>
          </div>
        </form>
      ) : null}

      {!showAddressForm && addresses.length === 0 && !addressesError ? (
        <EmptyState
          icon="map-pin"
          title="No addresses saved"
          description="Add an address to speed up checkout."
          actions={<Button onClick={openAddressForm}>Add your first address</Button>}
        />
      ) : null}

      {!showAddressForm && addresses.length > 0 ? (
        <div className="address-list">
          {addresses.map((address) => (
            <article key={address.id} className="address-card">
              <div className="address-info">
                <div className="address-header">
                  <span className="addr-label">{address.label}</span>
                  {address.isDefault ? <span className="default-badge">Default</span> : null}
                </div>
                <p className="addr-name">{address.recipientName}</p>
                <p className="addr-phone">{address.phone}</p>
                <p className="addr-full">
                  {address.line1}{address.line2 ? `, ${address.line2}` : ''}
                  {address.landmark ? `, ${address.landmark}` : ''}
                  <br />
                  {address.city}, {address.state} - {address.pincode}
                </p>
              </div>
              <div className="address-actions">
                {deleteAddressId === address.id ? (
                  <div className="address-delete-confirm" role="alert">
                    <span>Delete this address?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="danger"
                      loading={busyAddressId === address.id}
                      onClick={() => handleDeleteAddress(address.id)}
                    >
                      Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteAddressId(null)}>
                      Keep
                    </Button>
                  </div>
                ) : (
                  <>
                    {!address.isDefault ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busyAddressId === address.id}
                        onClick={() => handleSetDefault(address.id)}
                      >
                        Set default
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => handleEditAddress(address)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="danger"
                      onClick={() => setDeleteAddressId(address.id)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );

  const renderReviews = () => (
    <section className="account-panel">
      <div className="account-panel-head">
        <div>
          <span className="panel-eyebrow">What you said</span>
          <h2>My reviews</h2>
          <p>
            {myReviews.length} {myReviews.length === 1 ? 'review' : 'reviews'} you have
            written.
          </p>
        </div>
      </div>

      {reviewsError ? (
        <div className="account-inline-error" role="alert">
          <Icon name="alert-circle" size={18} />
          <span>{reviewsError}</span>
          <Button variant="outline" size="sm" onClick={loadMyReviews}>Retry</Button>
        </div>
      ) : isLoadingReviews && myReviews.length === 0 ? (
        <div className="reviews-skeleton" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <div className="review-skeleton" key={index}>
              <span className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
              <div className="skeleton-lines">
                <span className="skeleton" style={{ width: '38%', height: '14px' }} />
                <span className="skeleton" style={{ width: '82%', height: '12px' }} />
                <span className="skeleton" style={{ width: '60%', height: '12px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : myReviews.length === 0 ? (
        <EmptyState
          icon="star"
          title="You have not written a review yet"
          description="Once an order is delivered, you can rate the dish and tell other diners what you thought."
          actions={<Button to="/orders">See my delivered orders</Button>}
        />
      ) : (
        <ul className="my-reviews">
          {myReviews.map((review) => (
            <li className="my-review" key={review.id}>
              <div className="my-review-head">
                {review.product?.image?.url ? (
                  <Link to={`/product/${review.product.slug}`} className="my-review-image">
                    <img src={review.product.image.url} alt="" loading="lazy" />
                  </Link>
                ) : (
                  <span className="my-review-image my-review-image-fallback" aria-hidden="true">
                    <Icon name="chef-hat" size={20} />
                  </span>
                )}

                <div className="my-review-meta">
                  {review.product?.slug ? (
                    <Link to={`/product/${review.product.slug}`} className="my-review-product">
                      {review.product.name}
                    </Link>
                  ) : (
                    <span className="my-review-product">Dish</span>
                  )}
                  <span className="my-review-date">{formatDate(review.createdAt)}</span>
                </div>

                <span className={`my-review-status is-${review.status}`}>
                  {review.status === 'approved'
                    ? 'Published'
                    : review.status === 'pending'
                      ? 'Awaiting approval'
                      : review.status === 'rejected'
                        ? 'Not published'
                        : review.status}
                </span>

                <span className="my-review-rating" aria-label={`${review.rating} out of 5`}>
                  <Icon name="star-filled" size={15} />
                  {review.rating}
                </span>
              </div>

              {review.title ? <p className="my-review-title">{review.title}</p> : null}
              {review.body ? <p className="my-review-body">{review.body}</p> : null}

              {review.adminReply?.text ? (
                <div className="my-review-reply">
                  <span className="my-review-reply-badge">
                    <Icon name="shield-check" size={13} />
                    Reply from Foodie
                  </span>
                  <p>{review.adminReply.text}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const renderWishlist = () => (
    <section className="account-panel">
      <div className="account-panel-head">
        <div>
          <span className="panel-eyebrow">Saved for later</span>
          <h2>Your wishlist</h2>
          <p>{wishlist.length} {wishlist.length === 1 ? 'dish' : 'dishes'} waiting for you.</p>
        </div>
      </div>

      {wishlistError ? (
        <div className="account-inline-error" role="alert">
          <Icon name="alert-circle" size={18} />
          <span>{wishlistError}</span>
          <Button variant="outline" size="sm" onClick={loadUserData}>Retry</Button>
        </div>
      ) : wishlist.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Your wishlist is empty"
          description="Save dishes you love and come back to them later."
          actions={<Button to="/menu">Explore the menu</Button>}
        />
      ) : (
        <div className="wishlist-grid">
          {wishlist.map((item) => (
            <article key={item.id} className="wishlist-item">
              <Link to={`/product/${item.slug}`} className="wishlist-image">
                {item.image?.url ? (
                  <img src={item.image.url} alt={item.name} loading="lazy" />
                ) : (
                  <span className="wishlist-image-fallback"><Icon name="chef-hat" size={24} /></span>
                )}
              </Link>
              <div className="wishlist-info">
                <Link to={`/product/${item.slug}`} className="wishlist-name">
                  {item.name}
                </Link>
                <p className="wishlist-price">{formatINR(item.pricePaise || 0)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="wishlist-remove"
                loading={busyWishlistId === item.id}
                onClick={() => handleRemoveWishlist(item.id)}
                aria-label={`Remove ${item.name} from wishlist`}
              >
                <Icon name="trash" size={17} />
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderSecurity = () => (
    <>
      <section className="account-panel">
        <div className="account-panel-head">
          <div>
            <span className="panel-eyebrow">Account safety</span>
            <h2>Change password</h2>
            <p>Use a strong password you do not reuse elsewhere.</p>
          </div>
        </div>
        <form onSubmit={handlePasswordSubmit} className="account-form" noValidate>
          <div className="form-field">
            <label htmlFor="account-currentPassword">Current password</label>
            <Input
              id="account-currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
              placeholder="••••••••"
              error={passwordErrors.currentPassword}
              autoComplete="current-password"
              disabled={savingPassword}
              required
            />
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="account-newPassword">New password</label>
              <Input
                id="account-newPassword"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                placeholder="••••••••"
                error={passwordErrors.newPassword}
                autoComplete="new-password"
                disabled={savingPassword}
                required
              />
              <p className="field-hint">At least 8 characters with a letter and number</p>
            </div>
            <div className="form-field">
              <label htmlFor="account-confirmPassword">Confirm new password</label>
              <Input
                id="account-confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                placeholder="••••••••"
                error={passwordErrors.confirmPassword}
                autoComplete="new-password"
                disabled={savingPassword}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <Button type="submit" size="lg" loading={savingPassword}>
              Update password
            </Button>
          </div>
        </form>
      </section>

      <section className="account-panel danger-zone">
        <div className="account-panel-head">
          <div>
            <span className="panel-eyebrow">Careful</span>
            <h2>Danger zone</h2>
            <p>These actions are permanent and cannot be undone.</p>
          </div>
        </div>
        <div className="danger-item">
          <div>
            <strong>Delete account</strong>
            <p>Permanently delete your account and saved data.</p>
          </div>
          <Button variant="ghost" className="danger" disabled>
            Delete account
          </Button>
        </div>
      </section>
    </>
  );

  return (
    <motion.div
      className="account-page"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.2 : 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="account-heading">
        <div>
          <span className="eyebrow">My account</span>
          <h1>Your dashboard</h1>
          <p>Everything about your orders, details, and saved dishes in one place.</p>
        </div>
        <Button to="/menu" variant="secondary" iconLeft={<Icon name="chef-hat" size={17} />}>
          Order food
        </Button>
      </header>

      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="sidebar-profile">
            <span className="sidebar-avatar" aria-hidden="true">{getInitials(user?.name)}</span>
            <div>
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>

          <nav className="account-nav" aria-label="Account sections">
            <Link to="/" className="account-nav-item account-nav-link account-home-link">
              <Icon name="arrow-left" size={18} />
              <span>Home</span>
            </Link>

            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`account-nav-item ${activeSection === section.id ? 'is-active' : ''}`.trim()}
                aria-current={activeSection === section.id ? 'page' : undefined}
                onClick={() => setActiveSection(section.id)}
              >
                <Icon name={section.icon} size={18} />
                <span>{section.label}</span>
                <Icon name="chevron-right" size={15} />
              </button>
            ))}
            <Link to="/orders" className="account-nav-item account-nav-link">
              <Icon name="package" size={18} />
              <span>My orders</span>
              <span className="account-nav-count">{totalOrders}</span>
            </Link>
          </nav>

          <div className="sidebar-help">
            <Icon name="clock" size={18} />
            <strong>Need a hand?</strong>
            <p>We deliver from 11:00 AM to 11:00 PM, every day.</p>
          </div>
        </aside>

        <main className="account-main">
          {loadError ? (
            <div className="account-inline-error" role="alert">
              <Icon name="alert-circle" size={18} />
              <span>{loadError}</span>
              <Button variant="outline" size="sm" onClick={loadUserData}>Retry</Button>
            </div>
          ) : null}

          {activeSection === 'overview' ? renderOverview() : null}
          {activeSection === 'profile' ? renderProfile() : null}
            {activeSection === 'addresses' ? renderAddresses() : null}
            {activeSection === 'wishlist' ? renderWishlist() : null}
            {activeSection === 'reviews' ? renderReviews() : null}
            {activeSection === 'security' ? renderSecurity() : null}
          </main>
        </div>
    </motion.div>
  );
}
