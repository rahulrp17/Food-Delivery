import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { authApi } from '../../api/auth.api';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../lib/format';
import {
  focusFirstInvalidField,
  getErrorMessage,
  mapServerErrors,
  parseForm,
  settingsFormSchema,
} from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { Tabs, TabList, Tab } from '../../components/ui/Tabs';
import { FormSkeleton } from '../../components/loading';
import { ConfirmDialog } from '../../components/admin/Modal';
import './SettingsPage.css';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_HOURS = WEEKDAYS.map((_, day) => ({
  day,
  open: '00:00',
  close: '23:59',
  closed: false,
}));

const initialSettings = {
  name: 'Foodie',
  supportEmail: 'support@foodie.local',
  supportPhone: '',
  currency: 'INR',
  deliveryFeePaise: 3900,
  freeDeliveryThresholdPaise: 49900,
  taxRateBps: 500,
  taxLabel: 'GST',
  minOrderPaise: 0,
  deliveryEstimateMinutes: { min: 28, max: 34 },
  serviceablePincodes: [],
  businessHours: DEFAULT_HOURS,
  notifications: { orderNew: true, lowStock: true, reviewNew: true },
  invoiceLegalName: '',
  invoiceGstin: '',
  invoiceAddress: '',
  invoiceFooter: 'Thank you for ordering with Foodie.',
  isAcceptingOrders: true,
};

const SETTINGS_TABS = [
  { key: 'store', label: 'Store Information' },
  { key: 'hours', label: 'Business Hours' },
  { key: 'delivery', label: 'Delivery & Pricing' },
  { key: 'tax', label: 'Tax & Invoice' },
  { key: 'estimate', label: 'Delivery Estimate' },
  { key: 'pincodes', label: 'Serviceable Pincodes' },
  { key: 'payments', label: 'Payments' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'profile', label: 'Admin Profile' },
  { key: 'security', label: 'Security & Sessions' },
];

const CONFIG_TABS = new Set([
  'store',
  'hours',
  'delivery',
  'tax',
  'estimate',
  'pincodes',
  'notifications',
]);

const PERSISTED_FIELDS = [
  'name',
  'supportEmail',
  'supportPhone',
  'currency',
  'deliveryFeePaise',
  'freeDeliveryThresholdPaise',
  'taxRateBps',
  'taxLabel',
  'minOrderPaise',
  'deliveryEstimateMinutes',
  'serviceablePincodes',
  'businessHours',
  'notifications',
  'invoiceLegalName',
  'invoiceGstin',
  'invoiceAddress',
  'invoiceFooter',
  'isAcceptingOrders',
];

const mergeHours = (hours) =>
  WEEKDAYS.map((_, day) => {
    const match = Array.isArray(hours) ? hours.find((entry) => entry?.day === day) : null;
    return match ? { ...DEFAULT_HOURS[day], ...match } : { ...DEFAULT_HOURS[day] };
  });

const mapSettingsToForm = (s) => ({
  ...initialSettings,
  ...Object.fromEntries(PERSISTED_FIELDS.map((key) => [key, s[key] ?? initialSettings[key]])),
  deliveryEstimateMinutes: {
    ...initialSettings.deliveryEstimateMinutes,
    ...(s.deliveryEstimateMinutes || {}),
  },
  notifications: {
    ...initialSettings.notifications,
    ...(s.notifications || {}),
  },
  businessHours: mergeHours(s.businessHours),
  serviceablePincodes: Array.isArray(s.serviceablePincodes) ? s.serviceablePincodes : [],
  isAcceptingOrders: s.isAcceptingOrders !== false,
});

const isSameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const hasUnsavedChanges = (form, baseline) => {
  if (!baseline) return false;
  return PERSISTED_FIELDS.some((key) => !isSameValue(form[key], baseline[key]));
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const user = useAuthStore((state) => state.user);
  const setStoreUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const reduceMotion = useReducedMotion();

  const [form, setForm] = useState(initialSettings);
  const [touched, setTouched] = useState(false);
  const [activeTab, setActiveTab] = useState('store');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  useDocumentTitle('Settings');

  const {
    data,
    error: settingsError,
    isPending: settingsPending,
    isFetching: settingsFetching,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: () => adminApi.settings(),
  });

  const sessionsQuery = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authApi.sessions(),
    enabled: activeTab === 'security',
  });

  const serverForm = useMemo(
    () => (data?.settings ? mapSettingsToForm(data.settings) : null),
    [data]
  );

  const dirty = touched && hasUnsavedChanges(form, serverForm);

  const profileDirty =
    profile.name !== (user?.name || '') || profile.phone !== (user?.phone || '');

  const passwordDirty = Boolean(
    password.currentPassword || password.newPassword || password.confirmPassword
  );

  /* Any unsaved edit anywhere on the page counts as "dirty" for navigation
     guards, even though each section saves on its own. */
  const unsaved = dirty || profileDirty || passwordDirty;

  /* Only overwrite the form while the admin has not started editing it, so a
     background refetch never wipes in-progress changes. */
  useEffect(() => {
    if (!serverForm) return;
    if (!touched) setForm(serverForm);
  }, [serverForm, touched]);

  useEffect(() => {
    setProfile({ name: user?.name || '', phone: user?.phone || '' });
  }, [user?.name, user?.phone]);

  /* Warn before the tab is closed / reloaded with unsaved edits. */
  useEffect(() => {
    if (!unsaved) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsaved]);

  /* The router is declarative, so there is no blocker to hook into. Instead we
     intercept link clicks in the capture phase and ask for confirmation
     before the admin loses their edits. */
  useEffect(() => {
    if (!unsaved) return undefined;

    const handleDocumentClick = (event) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;

      const anchor = target.closest('a[href]');
      if (!anchor) return;
      if (anchor.hasAttribute('download')) return;
      if (anchor.target && anchor.target !== '_self') return;

      const href = anchor.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      let targetUrl;
      try {
        targetUrl = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (targetUrl.origin !== window.location.origin) return;
      if (targetUrl.pathname === window.location.pathname) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
      setLeaveOpen(true);
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [unsaved]);

  const updateMutation = useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: () => {
      setTouched(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings() });
      showSuccess('Settings saved');
    },
    onError: (error) => {
      setErrors(mapServerErrors(error?.details));
      showError(getErrorMessage(error, 'Failed to save settings'));
    },
  });

  const profileMutation = useMutation({
    mutationFn: (values) => authApi.updateProfile(values),
    onSuccess: (response) => {
      setStoreUser(response.data.user);
      setProfileErrors({});
      showSuccess('Profile updated');
    },
    onError: (error) => {
      setProfileErrors(mapServerErrors(error?.details));
      showError(getErrorMessage(error, 'Failed to update profile'));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.updatePassword(password.currentPassword, password.newPassword),
    onSuccess: () => {
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      showSuccess('Password updated. Other sessions were signed out.');
    },
    onError: (error) => {
      setPasswordErrors(mapServerErrors(error?.details));
      showError(getErrorMessage(error, 'Failed to update password'));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => authApi.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      showSuccess('Session revoked');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Failed to revoke session'));
    },
  });

  const signOutAllMutation = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: () => {
      logout();
      setSignOutAllOpen(false);
      navigate('/admin/login', { replace: true });
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Failed to sign out sessions'));
    },
  });

  const patchForm = useCallback((updater) => {
    setTouched(true);
    setForm(updater);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    patchForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handlePinChange = (e) => {
    const pins = e.target.value
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => /^\d{6}$/.test(p));
    patchForm((prev) => ({ ...prev, serviceablePincodes: pins }));
  };

  const updateHour = (index, field, value) => {
    patchForm((prev) => ({
      ...prev,
      businessHours: prev.businessHours.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const updateNotification = (key) => {
    patchForm((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));
  };

  const discardChanges = useCallback(() => {
    if (serverForm) setForm(serverForm);
    setTouched(false);
    setErrors({});
  }, [serverForm]);

  /* The profile and the password form have their own save buttons, so their
     edits are tracked separately but guarded by the same warning. */
  const discardAccountChanges = useCallback(() => {
    setProfile({ name: user?.name || '', phone: user?.phone || '' });
    setProfileErrors({});
    setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({});
  }, [user?.name, user?.phone]);

  const discardEverything = useCallback(() => {
    discardChanges();
    discardAccountChanges();
  }, [discardChanges, discardAccountChanges]);

  const sectionDirty =
    (CONFIG_TABS.has(activeTab) && dirty) ||
    (activeTab === 'profile' && profileDirty) ||
    (activeTab === 'security' && passwordDirty);

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) return;
    if (sectionDirty) {
      setPendingTab(nextTab);
      setDiscardOpen(true);
      return;
    }
    setActiveTab(nextTab);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const estimate = form.deliveryEstimateMinutes || {};
    const parsed = parseForm(settingsFormSchema, {
      name: form.name,
      supportEmail: form.supportEmail,
      supportPhone: form.supportPhone,
      deliveryFee: Number(form.deliveryFeePaise || 0) / 100,
      freeDeliveryThreshold: Number(form.freeDeliveryThresholdPaise || 0) / 100,
      taxRate: Number(form.taxRateBps || 0) / 100,
      minOrder: Number(form.minOrderPaise || 0) / 100,
      estimateMin: estimate.min,
      estimateMax: estimate.max,
      isAcceptingOrders: form.isAcceptingOrders,
    });
    if (!parsed.success) {
      setErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }

    const data = parsed.data;
    setErrors({});
    setSaving(true);
    const payload = {
      name: data.name,
      supportEmail: data.supportEmail,
      supportPhone: form.supportPhone || '',
      currency: form.currency,
      deliveryFeePaise: Math.round(data.deliveryFee * 100),
      freeDeliveryThresholdPaise: Math.round(data.freeDeliveryThreshold * 100),
      taxRateBps: Math.round(data.taxRate * 100),
      taxLabel: form.taxLabel,
      minOrderPaise: Math.round(data.minOrder * 100),
      deliveryEstimateMinutes: {
        min: data.estimateMin,
        max: data.estimateMax,
      },
      serviceablePincodes: form.serviceablePincodes,
      businessHours: form.businessHours.map(({ day, open, close, closed }) => ({
        day,
        open,
        close,
        closed: Boolean(closed),
      })),
      notifications: {
        orderNew: Boolean(form.notifications.orderNew),
        lowStock: Boolean(form.notifications.lowStock),
        reviewNew: Boolean(form.notifications.reviewNew),
      },
      invoiceLegalName: form.invoiceLegalName || '',
      invoiceGstin: form.invoiceGstin || '',
      invoiceAddress: form.invoiceAddress || '',
      invoiceFooter: form.invoiceFooter || '',
      isAcceptingOrders: data.isAcceptingOrders,
    };
    try {
      await updateMutation.mutateAsync(payload);
    } catch {
      // The mutation surfaces field and toast errors.
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (profile.name.trim().length < 2) nextErrors.name = 'Name must be at least 2 characters';
    if (profile.phone && !/^\+?[0-9]{10,15}$/.test(profile.phone.trim())) {
      nextErrors.phone = 'Enter a valid phone number';
    }
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    profileMutation.mutate({
      name: profile.name.trim(),
      ...(profile.phone.trim() ? { phone: profile.phone.trim() } : {}),
    });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (password.newPassword.length < 8) {
      nextErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Za-z]/.test(password.newPassword) || !/\d/.test(password.newPassword)) {
      nextErrors.newPassword = 'Use at least one letter and one number';
    }
    if (password.newPassword !== password.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    passwordMutation.mutate();
  };

  const payments = data?.payments;
  const sessions = sessionsQuery.data?.data?.sessions || [];

  const saveState = saving
    ? { tone: 'saving', label: 'Saving…', icon: 'refresh' }
    : (activeTab === 'profile'
        ? profileDirty
        : activeTab === 'security'
          ? passwordDirty
          : dirty)
      ? { tone: 'dirty', label: 'Unsaved changes', icon: 'alert-circle' }
      : { tone: 'saved', label: 'All changes saved', icon: 'check' };

  const renderConfigSection = () => {
    if (activeTab === 'store') {
      return (
        <section className="settings-section">
          <h2>Store Information</h2>
          <p className="settings-note">
            The store name and support contacts shown to customers across the storefront.
          </p>
          <div className="form-field">
            <label htmlFor="store-name">Store Name</label>
            <Input
              id="store-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Foodie"
              error={errors.name}
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="support-email">Support Email</label>
              <Input
                id="support-email"
                name="supportEmail"
                type="email"
                value={form.supportEmail}
                onChange={handleChange}
                placeholder="support@foodie.local"
                error={errors.supportEmail}
              />
            </div>
            <div className="form-field">
              <label htmlFor="support-phone">Support Phone</label>
              <Input
                id="support-phone"
                name="supportPhone"
                value={form.supportPhone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                error={errors.supportPhone}
              />
            </div>
          </div>
          <div className="form-field">
            <label className="toggle-label">
              <input
                type="checkbox"
                name="isAcceptingOrders"
                checked={form.isAcceptingOrders}
                onChange={handleChange}
              />
              <span>Accepting Orders</span>
            </label>
            <p className="field-hint">
              When disabled, customers cannot place new orders.
            </p>
          </div>
        </section>
      );
    }

    if (activeTab === 'hours') {
      return (
        <section className="settings-section">
          <h2>Business Hours</h2>
          <p className="settings-note">
            Orders are accepted only during these hours, evaluated in the server timezone.
          </p>
          <div className="hours-grid">
            {form.businessHours.map((entry, index) => (
              <div key={entry.day} className="hours-row">
                <span className="hours-day">{WEEKDAYS[entry.day]}</span>
                <label className="toggle-label hours-toggle">
                  <input
                    type="checkbox"
                    checked={entry.closed}
                    onChange={(event) => updateHour(index, 'closed', event.target.checked)}
                  />
                  <span>Closed</span>
                </label>
                <label className="hours-time">
                  <span className="visually-hidden">{WEEKDAYS[entry.day]} opening time</span>
                  <input
                    type="time"
                    value={entry.open}
                    disabled={entry.closed}
                    onChange={(event) => updateHour(index, 'open', event.target.value)}
                  />
                </label>
                <span className="hours-separator" aria-hidden="true">to</span>
                <label className="hours-time">
                  <span className="visually-hidden">{WEEKDAYS[entry.day]} closing time</span>
                  <input
                    type="time"
                    value={entry.close}
                    disabled={entry.closed}
                    onChange={(event) => updateHour(index, 'close', event.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === 'delivery') {
      return (
        <section className="settings-section">
          <h2>Delivery &amp; Pricing</h2>
          <p className="settings-note">
            Fees are stored in paise and shown to customers in rupees.
          </p>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="delivery-fee">Delivery Fee (₹)</label>
              <Input
                id="delivery-fee"
                name="deliveryFeePaise"
                type="number"
                step="0.01"
                min="0"
                value={form.deliveryFeePaise ? (form.deliveryFeePaise / 100).toFixed(2) : ''}
                onChange={(e) => {
                  patchForm((prev) => ({
                    ...prev,
                    deliveryFeePaise: Math.round(parseFloat(e.target.value || 0) * 100),
                  }));
                  if (errors.deliveryFee) setErrors((prev) => ({ ...prev, deliveryFee: null }));
                }}
                placeholder="39.00"
                error={errors.deliveryFee}
              />
            </div>
            <div className="form-field">
              <label htmlFor="free-threshold">Free Delivery Threshold (₹)</label>
              <Input
                id="free-threshold"
                name="freeDeliveryThresholdPaise"
                type="number"
                step="0.01"
                min="0"
                value={
                  form.freeDeliveryThresholdPaise
                    ? (form.freeDeliveryThresholdPaise / 100).toFixed(2)
                    : ''
                }
                onChange={(e) => {
                  patchForm((prev) => ({
                    ...prev,
                    freeDeliveryThresholdPaise: Math.round(
                      parseFloat(e.target.value || 0) * 100
                    ),
                  }));
                  if (errors.freeDeliveryThreshold) {
                    setErrors((prev) => ({ ...prev, freeDeliveryThreshold: null }));
                  }
                }}
                placeholder="499.00"
                error={errors.freeDeliveryThreshold}
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="min-order">Min Order (₹)</label>
            <Input
              id="min-order"
              name="minOrderPaise"
              type="number"
              step="0.01"
              min="0"
              value={form.minOrderPaise ? (form.minOrderPaise / 100).toFixed(2) : ''}
              onChange={(e) => {
                patchForm((prev) => ({
                  ...prev,
                  minOrderPaise: Math.round(parseFloat(e.target.value || 0) * 100),
                }));
                if (errors.minOrder) setErrors((prev) => ({ ...prev, minOrder: null }));
              }}
              placeholder="0.00"
              error={errors.minOrder}
            />
          </div>
        </section>
      );
    }

    if (activeTab === 'tax') {
      return (
        <section className="settings-section">
          <h2>Tax &amp; Invoice</h2>
          <p className="settings-note">
            Tax rate is a percentage. Invoice details are printed on every receipt.
          </p>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="tax-rate">Tax Rate (%)</label>
              <Input
                id="tax-rate"
                name="taxRateBps"
                type="number"
                step="0.1"
                min="0"
                max="30"
                value={form.taxRateBps ? (form.taxRateBps / 100).toFixed(1) : ''}
                onChange={(e) => {
                  patchForm((prev) => ({
                    ...prev,
                    taxRateBps: Math.round(parseFloat(e.target.value || 0) * 100),
                  }));
                  if (errors.taxRate) setErrors((prev) => ({ ...prev, taxRate: null }));
                }}
                placeholder="5.0"
                error={errors.taxRate}
              />
            </div>
            <div className="form-field">
              <label htmlFor="tax-label">Tax Label</label>
              <Input
                id="tax-label"
                name="taxLabel"
                value={form.taxLabel}
                onChange={handleChange}
                placeholder="GST"
                error={errors.taxLabel}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="invoice-legal-name">Legal Business Name</label>
              <Input
                id="invoice-legal-name"
                name="invoiceLegalName"
                value={form.invoiceLegalName}
                onChange={handleChange}
                placeholder="Foodie Kitchen Pvt Ltd"
                error={errors.invoiceLegalName}
              />
            </div>
            <div className="form-field">
              <label htmlFor="invoice-gstin">GSTIN</label>
              <Input
                id="invoice-gstin"
                name="invoiceGstin"
                value={form.invoiceGstin}
                onChange={handleChange}
                placeholder="29ABCDE1234F1Z5"
                error={errors.invoiceGstin}
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="invoice-address">Invoice Address</label>
            <textarea
              id="invoice-address"
              name="invoiceAddress"
              rows={2}
              maxLength={300}
              value={form.invoiceAddress}
              onChange={handleChange}
              className="textarea-input"
              placeholder="Registered business address"
            />
            {errors.invoiceAddress ? (
              <p className="field-error" role="alert">{errors.invoiceAddress}</p>
            ) : null}
          </div>
          <div className="form-field">
            <label htmlFor="invoice-footer">Invoice Footer</label>
            <Input
              id="invoice-footer"
              name="invoiceFooter"
              value={form.invoiceFooter}
              onChange={handleChange}
              placeholder="Thank you for ordering with Foodie."
              error={errors.invoiceFooter}
            />
          </div>
        </section>
      );
    }

    if (activeTab === 'estimate') {
      return (
        <section className="settings-section">
          <h2>Delivery Estimate</h2>
          <p className="settings-note">
            The window shown to customers between placing an order and delivery.
          </p>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="estimate-min">Min (minutes)</label>
              <Input
                id="estimate-min"
                name="deliveryEstimateMinutes.min"
                type="number"
                min="1"
                max="240"
                value={form.deliveryEstimateMinutes?.min || 28}
                onChange={(e) => {
                  patchForm((prev) => ({
                    ...prev,
                    deliveryEstimateMinutes: {
                      ...prev.deliveryEstimateMinutes,
                      min: parseInt(e.target.value, 10),
                    },
                  }));
                  if (errors.estimateMin) setErrors((prev) => ({ ...prev, estimateMin: null }));
                }}
                error={errors.estimateMin}
              />
            </div>
            <div className="form-field">
              <label htmlFor="estimate-max">Max (minutes)</label>
              <Input
                id="estimate-max"
                name="deliveryEstimateMinutes.max"
                type="number"
                min="1"
                max="240"
                value={form.deliveryEstimateMinutes?.max || 34}
                onChange={(e) => {
                  patchForm((prev) => ({
                    ...prev,
                    deliveryEstimateMinutes: {
                      ...prev.deliveryEstimateMinutes,
                      max: parseInt(e.target.value, 10),
                    },
                  }));
                  if (errors.estimateMax) setErrors((prev) => ({ ...prev, estimateMax: null }));
                }}
                error={errors.estimateMax}
              />
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === 'pincodes') {
      return (
        <section className="settings-section">
          <h2>Serviceable Pincodes</h2>
          <p className="settings-note">
            Only customers in these pincodes can place an order.
          </p>
          <div className="form-field">
            <label htmlFor="pincodes">One per line (6 digits)</label>
            <textarea
              id="pincodes"
              value={form.serviceablePincodes?.join('\n') || ''}
              onChange={handlePinChange}
              rows={6}
              className="textarea-input"
              placeholder={'110001\n110002\n110003'}
            />
            <p className="field-hint">
              Enter 6-digit pincodes, one per line. Leave empty for all pincodes.
            </p>
          </div>
        </section>
      );
    }

    return (
      <section className="settings-section">
        <h2>Notification Preferences</h2>
        <p className="settings-note">
          Controls which operational alerts appear in the admin notification center.
        </p>
        <div className="preference-list">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={form.notifications.orderNew}
              onChange={() => updateNotification('orderNew')}
            />
            <span>
              <strong>New orders</strong>
              <span className="preference-hint">Alert when a customer places an order.</span>
            </span>
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={form.notifications.lowStock}
              onChange={() => updateNotification('lowStock')}
            />
            <span>
              <strong>Low stock</strong>
              <span className="preference-hint">
                Alert when a product crosses the low-stock threshold.
              </span>
            </span>
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={form.notifications.reviewNew}
              onChange={() => updateNotification('reviewNew')}
            />
            <span>
              <strong>New reviews</strong>
              <span className="preference-hint">Alert when a review awaits moderation.</span>
            </span>
          </label>
        </div>
      </section>
    );
  };

  const renderPanel = () => {
    if (settingsError && !serverForm) {
      return (
        <ErrorState
          title="We could not load the configuration"
          description={
            getErrorMessage(settingsError, 'The settings request failed. Please try again.')
          }
          onRetry={() => refetchSettings()}
        />
      );
    }

    /* Only the configuration panel waits on the settings payload. The profile
       and security panels have their own data, so they are never blanked. */
    if (settingsPending && CONFIG_TABS.has(activeTab)) {
      return (
        <div className="settings-panel-loading" aria-busy="true">
          <FormSkeleton fields={6} rows={2} />
        </div>
      );
    }

    if (settingsPending && activeTab === 'payments') {
      return (
        <section className="settings-section">
          <h2>Payment Provider</h2>
          <p className="settings-note">
            Provider credentials are managed through the backend environment and are never
            exposed to the browser.
          </p>
          <div className="payment-status-grid" aria-busy="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="payment-status-card">
                <span className="skeleton" style={{ height: '0.625rem', width: '58%' }} />
                <span className="skeleton" style={{ height: '1rem', width: '38%' }} />
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === 'payments') {
      return (
        <section className="settings-section">
          <h2>Payment Provider</h2>
          <p className="settings-note">
            Provider credentials are managed through the backend environment and are never
            exposed to the browser.
          </p>
          <div className="payment-status-grid">
            <div className="payment-status-card">
              <span className="payment-status-label">Provider</span>
              <strong>{payments?.label || 'Stripe'}</strong>
            </div>
            <div className="payment-status-card">
              <span className="payment-status-label">Mode</span>
              <strong>{payments?.mode === 'live' ? 'Live' : 'Test'}</strong>
            </div>
            <div className="payment-status-card">
              <span className="payment-status-label">API key</span>
              <strong className={payments?.configured ? 'is-ok' : 'is-warning'}>
                {payments?.configured ? 'Configured' : 'Missing'}
              </strong>
            </div>
            <div className="payment-status-card">
              <span className="payment-status-label">Webhook</span>
              <strong className={payments?.webhookConfigured ? 'is-ok' : 'is-warning'}>
                {payments?.webhookConfigured ? 'Configured' : 'Missing'}
              </strong>
            </div>
            <div className="payment-status-card">
              <span className="payment-status-label">Currency</span>
              <strong>{payments?.currency || form.currency}</strong>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === 'profile') {
      return (
        <form onSubmit={handleProfileSubmit} className="settings-section" noValidate>
          <h2>Admin Profile</h2>
          <p className="settings-note">
            Your name and phone number are shown on invoices and internal order notes.
          </p>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="profile-name">Name</label>
              <Input
                id="profile-name"
                name="name"
                value={profile.name}
                onChange={(event) => {
                  setProfile((prev) => ({ ...prev, name: event.target.value }));
                  if (profileErrors.name) setProfileErrors((prev) => ({ ...prev, name: null }));
                }}
                error={profileErrors.name}
              />
            </div>
            <div className="form-field">
              <label htmlFor="profile-phone">Phone</label>
              <Input
                id="profile-phone"
                name="phone"
                value={profile.phone}
                onChange={(event) => {
                  setProfile((prev) => ({ ...prev, phone: event.target.value }));
                  if (profileErrors.phone) {
                    setProfileErrors((prev) => ({ ...prev, phone: null }));
                  }
                }}
                placeholder="+91 98765 43210"
                error={profileErrors.phone}
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="profile-email">Email</label>
            <Input id="profile-email" value={user?.email || ''} disabled />
            <p className="field-hint">Email changes are handled by support.</p>
          </div>
          <div className="settings-actions">
            <Button type="submit" loading={profileMutation.isPending} disabled={!profileDirty}>
              Save Profile
            </Button>
          </div>
        </form>
      );
    }

    if (activeTab === 'security') {
      return (
        <div className="security-stack">
          <form onSubmit={handlePasswordSubmit} className="settings-section" noValidate>
            <h2>Change Password</h2>
            <p className="settings-note">
              Changing your password signs out every other device.
            </p>
            <div className="form-field">
              <label htmlFor="current-password">Current Password</label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={password.currentPassword}
                onChange={(event) => {
                  setPassword((prev) => ({ ...prev, currentPassword: event.target.value }));
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors((prev) => ({ ...prev, currentPassword: null }));
                  }
                }}
                error={passwordErrors.currentPassword}
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="new-password">New Password</label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password.newPassword}
                  onChange={(event) => {
                    setPassword((prev) => ({ ...prev, newPassword: event.target.value }));
                    if (passwordErrors.newPassword) {
                      setPasswordErrors((prev) => ({ ...prev, newPassword: null }));
                    }
                  }}
                  error={passwordErrors.newPassword}
                />
              </div>
              <div className="form-field">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={password.confirmPassword}
                  onChange={(event) => {
                    setPassword((prev) => ({ ...prev, confirmPassword: event.target.value }));
                    if (passwordErrors.confirmPassword) {
                      setPasswordErrors((prev) => ({ ...prev, confirmPassword: null }));
                    }
                  }}
                  error={passwordErrors.confirmPassword}
                />
              </div>
            </div>
            <div className="settings-actions">
              <Button type="submit" loading={passwordMutation.isPending}>
                Update Password
              </Button>
            </div>
          </form>

          <section className="settings-section">
            <div className="settings-section-head">
              <div>
                <h2>Active Sessions</h2>
                <p className="settings-note">
                  Devices signed in with your admin account. Revoke anything you do not
                  recognize.
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setSignOutAllOpen(true)}
              >
                Sign out all devices
              </Button>
            </div>

            {sessionsQuery.isPending ? (
              <div className="session-list" aria-busy="true">
                <span className="skeleton" style={{ height: '3.5rem' }} aria-hidden="true" />
                <span className="skeleton" style={{ height: '3.5rem' }} aria-hidden="true" />
              </div>
            ) : sessionsQuery.error ? (
              <ErrorState
                title="We could not load your sessions"
                description={getErrorMessage(sessionsQuery.error, 'Failed to load sessions')}
                onRetry={() => sessionsQuery.refetch()}
              />
            ) : sessions.length === 0 ? (
              <EmptyState
                icon="shield-check"
                title="No active sessions"
                description="Only this device is signed in to the admin area right now."
              />
            ) : (
              <ul className="session-list">
                {sessions.map((session) => (
                  <li key={session.id} className="session-row">
                    <div className="session-info">
                      <strong>
                        {session.userAgent || 'Unknown device'}
                        {session.current ? (
                          <span className="session-badge">This device</span>
                        ) : null}
                      </strong>
                      <span className="settings-note">
                        {session.ip || 'Unknown IP'} · Last active{' '}
                        {formatDate(session.lastUsedAt)}
                      </span>
                    </div>
                    {!session.current ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        loading={
                          revokeMutation.isPending &&
                          revokeMutation.variables === session.id
                        }
                        onClick={() => revokeMutation.mutate(session.id)}
                      >
                        Revoke
                      </Button>
                    ) : (
                      <span className="session-badge session-badge-current">Active</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="settings-form" noValidate>
        {renderConfigSection()}
        <footer className="settings-save-bar">
          <span className={`settings-save-state is-${saveState.tone}`} role="status">
            <Icon name={saveState.icon} size={15} label="" />
            {saveState.label}
          </span>
          <div className="settings-save-actions">
            {dirty ? (
              <Button type="button" variant="ghost" size="sm" onClick={discardChanges}>
                Discard
              </Button>
            ) : null}
            <Button type="submit" size="lg" loading={saving} disabled={!dirty && !saving}>
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>
        </footer>
      </form>
    );
  };

  return (
    <div className="settings-page">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Configure store operations and your admin account."
        actions={
          <>
            {!CONFIG_TABS.has(activeTab) ? (
              <span
                className={`settings-save-chip settings-save-state is-${saveState.tone}`}
                role="status"
              >
                <Icon name={saveState.icon} size={15} label="" />
                {saveState.label}
              </span>
            ) : null}
            <RefreshIndicator
              isFetching={settingsFetching && !settingsPending}
              label="Refreshing settings"
            />
          </>
        }
      />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <span className="settings-nav-eyebrow">Sections</span>
          <Tabs activeTab={activeTab} onChange={handleTabChange}>
            <TabList>
              {SETTINGS_TABS.map((tab) => (
                <Tab key={tab.key} value={tab.key}>
                  {tab.label}
                </Tab>
              ))}
            </TabList>
          </Tabs>
          <p className="settings-nav-hint">
            Changes are saved per section. Switching sections with unsaved edits asks you first.
          </p>
        </nav>

        <Motion.div
          key={activeTab}
          className="settings-panel"
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          aria-busy={settingsPending || undefined}
          tabIndex={-1}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {settingsError && serverForm ? (
            <div className="settings-inline-error" role="alert">
              <Icon name="alert-circle" size={18} label="" />
              <span>
                {getErrorMessage(
                  settingsError,
                  'The latest settings could not be loaded. You are seeing the last saved values.'
                )}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => refetchSettings()}
                iconLeft={<Icon name="refresh" size={15} />}
              >
                Retry
              </Button>
            </div>
          ) : null}
          {renderPanel()}
        </Motion.div>
      </div>

      <ConfirmDialog
        isOpen={discardOpen}
        onClose={() => {
          setDiscardOpen(false);
          setPendingTab(null);
        }}
        onConfirm={async () => {
          discardEverything();
          if (pendingTab) setActiveTab(pendingTab);
          setPendingTab(null);
        }}
        title="Discard unsaved changes?"
        message="You have edits that have not been saved. Leaving this section will discard them."
        confirmText="Discard changes"
        cancelText="Keep editing"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={leaveOpen}
        onClose={() => {
          setLeaveOpen(false);
          setPendingNavigation(null);
        }}
        onConfirm={async () => {
          const target = pendingNavigation;
          discardEverything();
          setLeaveOpen(false);
          setPendingNavigation(null);
          if (target) navigate(target);
        }}
        title="Leave without saving?"
        message="You have settings edits that have not been saved. Leaving this page will discard them."
        confirmText="Discard and leave"
        cancelText="Stay on this page"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={signOutAllOpen}
        onClose={() => setSignOutAllOpen(false)}
        onConfirm={async () => {
          await signOutAllMutation.mutateAsync();
        }}
        title="Sign out all devices"
        message="This will end every session, including this one, and return you to the login page."
        confirmText="Sign out everything"
        variant="danger"
        loading={signOutAllMutation.isPending}
      />
    </div>
  );
}
