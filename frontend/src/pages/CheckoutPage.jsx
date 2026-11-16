import { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../api/user.api';
import { ordersApi } from '../api/orders.api';
import { paymentsApi } from '../api/payments.api';
import { formatINR, pluralize } from '../lib/format';
import {
  addressFormSchema,
  focusFirstInvalidField,
  getErrorMessage,
  mapServerErrors,
  parseForm,
} from '../lib/validation/forms';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import { useUiStore } from '../stores/ui.store';
import './CheckoutPage.css';

const STEPS = [
  { id: 'address', label: 'Delivery' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Confirm' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { pricing, items, isLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const showSuccess = useUiStore((s) => s.success);
  const showError = useUiStore((s) => s.error);

  const [step, setStep] = useState('address');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    recipientName: '',
    phone: '',
    line1: '',
    line2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [addressErrors, setAddressErrors] = useState({});
  const [addressLoadError, setAddressLoadError] = useState(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [couponCode] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated]);

  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    setAddressLoadError(null);
    try {
      const res = await userApi.listAddresses();
      const addr = res.addresses || [];
      setAddresses(addr);
      const defaultAddr = addr.find((a) => a.isDefault) || addr[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
    } catch (error) {
      setAddressLoadError(getErrorMessage(error, 'Failed to load your saved addresses'));
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleAddressChange = (field, value) => {
    setNewAddress((prev) => ({ ...prev, [field]: value }));
    if (addressErrors[field]) {
      setAddressErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    const parsed = parseForm(addressFormSchema, newAddress);
    if (!parsed.success) {
      setAddressErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }

    try {
      const res = await userApi.createAddress(parsed.data);
      const addr = res.address;
      setAddresses((prev) => [...prev, addr]);
      setSelectedAddressId(addr.id);
      setShowAddressForm(false);
      setAddressErrors({});
      setNewAddress({ label: 'Home', recipientName: '', phone: '', line1: '', line2: '', landmark: '', city: '', state: '', pincode: '' });
      showSuccess('Address saved');
    } catch (error) {
      const fieldErrors = mapServerErrors(error?.details, [
        'label', 'recipientName', 'phone', 'line1', 'line2', 'landmark',
        'city', 'state', 'pincode', 'isDefault',
      ]);
      if (Object.keys(fieldErrors).length > 0) {
        setAddressErrors(fieldErrors);
        focusFirstInvalidField();
      }
      showError(getErrorMessage(error, 'Failed to save address'));
    }
  };

  const handleSelectAddress = (id) => setSelectedAddressId(id);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      showError('Please select a delivery address');
      return;
    }
    if (!items.length) {
      showError('Your cart is empty');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await ordersApi.create({
        addressId: selectedAddressId,
        couponCode: couponCode || undefined,
        idempotencyKey,
      });
      const order = res.order;

      const payment = await paymentsApi.checkout(order.id);
      if (payment?.sessionUrl) {
        window.location.href = payment.sessionUrl;
      } else {
        showError('Failed to create checkout session');
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to place order');
      setOrderError(message);
      showError(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (isLoading || (!isAuthenticated && step !== 'address')) {
    return (
      <div className="checkout-page">
        <div className="checkout-skeleton">
          <div className="skeleton" style={{ width: '30%', height: 32 }} />
          <div className="skeleton" style={{ width: '100%', height: 200 }} />
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="checkout-page">
        <EmptyState
          icon="shopping-bag"
          headingLevel="h1"
          title="Your cart is empty"
          description="Browse the menu and add something worth looking forward to."
          actions={
            <Button onClick={() => navigate('/menu')} iconRight={<Icon name="arrow-right" size={17} />}>
              Explore the menu
            </Button>
          }
        />
      </div>
    );
  }

  const canProceedToPayment = step === 'address' && selectedAddressId;
  const activeStepIndex = STEPS.findIndex((item) => item.id === step);
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const panelMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };
  const panelTransition = { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] };

  return (
    <div className="checkout-page">
      <header className="checkout-masthead">
        <p className="eyebrow">Checkout</p>
        <h1 className="checkout-masthead-title">Finish your order</h1>
        <p className="checkout-masthead-text">
          Three short steps. We keep your cart exactly as you left it.
        </p>
      </header>

      <nav className="checkout-progress" aria-label="Checkout progress">
        <ol className="checkout-progress-list">
          {STEPS.map((item, index) => {
            const state =
              index < activeStepIndex
                ? 'completed'
                : index === activeStepIndex
                  ? 'active'
                  : 'upcoming';

            return (
              <li
                key={item.id}
                className={`progress-step ${state === 'active' ? 'active' : ''} ${state === 'completed' ? 'completed' : ''}`.trim()}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                <span className="step-number" aria-hidden="true">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={state === 'completed' ? 'done' : 'index'}
                      className="step-number-inner"
                      initial={
                        reduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.55, rotate: state === 'completed' ? -25 : 25 }
                      }
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={
                        reduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.55, rotate: state === 'completed' ? 25 : -25 }
                      }
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {state === 'completed' ? (
                        <Icon name="check" size={15} strokeWidth={2.5} />
                      ) : (
                        index + 1
                      )}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="step-label">{item.label}</span>

                {index < STEPS.length - 1 ? (
                  <motion.span
                    className="step-connector"
                    aria-hidden="true"
                    initial={false}
                    animate={{ scaleX: state === 'completed' ? 1 : 0 }}
                    style={{ originX: 0, originY: 0.5 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.36,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="checkout-layout">
        <div className="checkout-form">
          <AnimatePresence mode="wait" initial={false}>
            {step === 'address' && (
              <motion.section
                key="address"
                className="checkout-section"
                aria-labelledby="address-heading"
                initial={panelMotion.initial}
                animate={panelMotion.animate}
                exit={panelMotion.exit}
                transition={panelTransition}
              >
                <h2 id="address-heading">Delivery Address</h2>
                <p className="section-hint">Select or add a delivery address</p>

                {addressLoadError ? (
                  <div className="checkout-inline-error" role="alert">
                    <Icon name="alert-circle" size={18} />
                    <span>{addressLoadError}</span>
                    <Button variant="outline" size="sm" onClick={loadAddresses} loading={isLoadingAddresses}>
                      Retry
                    </Button>
                  </div>
                ) : null}

                {isLoadingAddresses && addresses.length === 0 ? (
                  <p className="checkout-address-loading">Loading your saved addresses…</p>
                ) : null}

                {addresses.length === 0 && !isLoadingAddresses && !addressLoadError ? (
                  <div className="checkout-address-empty">
                    <span className="checkout-address-empty-icon" aria-hidden="true">
                      <Icon name="map-pin" size={22} />
                    </span>
                    <p>
                      You have no saved addresses yet. Add one below and we will
                      remember it for next time.
                    </p>
                  </div>
                ) : null}

                {addresses.length > 0 && (
                  <div className="address-options">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`address-option ${selectedAddressId === addr.id ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => handleSelectAddress(addr.id)}
                        />
                        <span className="radio-indicator" aria-hidden="true" />
                        <span className="address-content">
                          <span className="address-header">
                            <span className="address-label">{addr.label}</span>
                            {addr.isDefault ? <span className="default-badge">Default</span> : null}
                          </span>
                          <span className="address-name">{addr.recipientName}</span>
                          <span className="address-phone">{addr.phone}</span>
                          <span className="address-full">
                            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                            {addr.landmark ? `, ${addr.landmark}` : ''}
                            <br />
                            {addr.city}, {addr.state} - {addr.pincode}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="add-address-btn"
                  onClick={() => setShowAddressForm(true)}
                >
                  <Icon name="plus" size={18} />
                  Add New Address
                </button>

                {showAddressForm && (
                  <form onSubmit={handleSaveAddress} className="address-form">
                    <h3>Add New Address</h3>
                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="label">Label</label>
                        <select
                          id="label"
                          value={newAddress.label}
                          onChange={(e) => handleAddressChange('label', e.target.value)}
                          className={`form-select ${addressErrors.label ? 'has-error' : ''}`.trim()}
                          aria-invalid={addressErrors.label ? 'true' : undefined}
                        >
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                          <option value="Other">Other</option>
                        </select>
                        {addressErrors.label ? <p className="field-error" role="alert">{addressErrors.label}</p> : null}
                      </div>
                      <div className="form-field">
                        <label htmlFor="recipientName">Recipient Name *</label>
                        <Input
                          id="recipientName"
                          value={newAddress.recipientName}
                          onChange={(e) => handleAddressChange('recipientName', e.target.value)}
                          placeholder="Full name"
                          error={addressErrors.recipientName}
                          required
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="phone">Phone *</label>
                        <Input
                          id="phone"
                          type="tel"
                          value={newAddress.phone}
                          onChange={(e) => handleAddressChange('phone', e.target.value)}
                          placeholder="+91 98765 43210"
                          error={addressErrors.phone}
                          required
                        />
                      </div>
                      <div className="form-field full-width">
                        <label htmlFor="line1">Address Line 1 *</label>
                        <Input
                          id="line1"
                          value={newAddress.line1}
                          onChange={(e) => handleAddressChange('line1', e.target.value)}
                          placeholder="House/Building/Apartment"
                          error={addressErrors.line1}
                          required
                        />
                      </div>
                      <div className="form-field full-width">
                        <label htmlFor="line2">Address Line 2</label>
                        <Input
                          id="line2"
                          value={newAddress.line2}
                          onChange={(e) => handleAddressChange('line2', e.target.value)}
                          placeholder="Area/Street/Landmark (optional)"
                          error={addressErrors.line2}
                        />
                      </div>
                      <div className="form-field full-width">
                        <label htmlFor="landmark">Landmark</label>
                        <Input
                          id="landmark"
                          value={newAddress.landmark}
                          onChange={(e) => handleAddressChange('landmark', e.target.value)}
                          placeholder="Nearby landmark (optional)"
                          error={addressErrors.landmark}
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="city">City *</label>
                        <Input
                          id="city"
                          value={newAddress.city}
                          onChange={(e) => handleAddressChange('city', e.target.value)}
                          placeholder="City"
                          error={addressErrors.city}
                          required
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="state">State *</label>
                        <Input
                          id="state"
                          value={newAddress.state}
                          onChange={(e) => handleAddressChange('state', e.target.value)}
                          placeholder="State"
                          error={addressErrors.state}
                          required
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="pincode">PIN Code *</label>
                        <Input
                          id="pincode"
                          value={newAddress.pincode}
                          onChange={(e) => handleAddressChange('pincode', e.target.value)}
                          placeholder="6-digit PIN"
                          error={addressErrors.pincode}
                          maxLength={6}
                          inputMode="numeric"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <Button type="button" variant="outline" onClick={() => setShowAddressForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="lg">Save Address</Button>
                    </div>
                  </form>
                )}
              </motion.section>
            )}

            {step === 'payment' && (
              <motion.section
                key="payment"
                className="checkout-section"
                aria-labelledby="payment-heading"
                initial={panelMotion.initial}
                animate={panelMotion.animate}
                exit={panelMotion.exit}
                transition={panelTransition}
              >
                <h2 id="payment-heading">Payment Method</h2>
                <p className="section-hint">Choose how you'd like to pay</p>

                <div className="payment-options">
                  <label className="payment-option selected">
                    <input type="radio" name="payment" value="stripe" defaultChecked />
                    <span className="radio-indicator" aria-hidden="true" />
                    <span className="payment-option-content">
                      <strong>Credit/Debit Card</strong>
                      <span>Pay securely with Stripe</span>
                    </span>
                  </label>
                  <label className="payment-option">
                    <input type="radio" name="payment" value="upi" />
                    <span className="radio-indicator" aria-hidden="true" />
                    <span className="payment-option-content">
                      <strong>UPI</strong>
                      <span>Pay via UPI apps (GPay, PhonePe, etc.)</span>
                    </span>
                  </label>
                </div>

                <div className="payment-note">
                  <Icon name="shield-check" size={18} />
                  <span>You'll be redirected to complete payment securely.</span>
                </div>
              </motion.section>
            )}

            {step === 'review' && (
              <motion.section
                key="review"
                className="checkout-section"
                aria-labelledby="review-heading"
                initial={panelMotion.initial}
                animate={panelMotion.animate}
                exit={panelMotion.exit}
                transition={panelTransition}
              >
                <h2 id="review-heading">Review & Confirm</h2>
                <p className="section-hint">Please review your order before placing</p>

                <div className="review-address">
                  <h4>Delivery to</h4>
                  {selectedAddress && (
                    <address>
                      {selectedAddress.recipientName}<br />
                      {selectedAddress.phone}<br />
                      {selectedAddress.line1}
                      {selectedAddress.line2 && `, ${selectedAddress.line2}`}
                      <br />
                      {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                    </address>
                  )}
                </div>

                <div className="review-items">
                  <h4>Items ({itemCount})</h4>
                  {items.map((item) => (
                    <div key={item.productId} className="review-item">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{formatINR(item.unitPricePaise * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="review-total">
                  <span>Total</span>
                  <span>{formatINR(pricing?.totalPaise || 0)}</span>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <div className="checkout-navigation">
            {step === 'address' && (
              <Button
                size="lg"
                fullWidth
                onClick={() => setStep('payment')}
                disabled={!canProceedToPayment}
              >
                Continue to Payment
              </Button>
            )}
            {step === 'payment' && (
              <div className="nav-buttons">
                <Button variant="outline" onClick={() => setStep('address')}>
                  Back
                </Button>
                <Button size="lg" onClick={() => setStep('review')}>
                  Continue to Review
                </Button>
              </div>
            )}
            {step === 'review' && (
              <div className="nav-buttons">
                <Button variant="outline" onClick={() => setStep('payment')}>
                  Back
                </Button>
                {orderError ? (
                  <div className="checkout-order-error" role="alert">
                    <Icon name="alert-circle" size={18} />
                    <span>{orderError}</span>
                    <Button variant="outline" size="sm" onClick={handlePlaceOrder} loading={isPlacingOrder}>
                      Try again
                    </Button>
                  </div>
                ) : null}
                <Button size="lg" onClick={handlePlaceOrder} disabled={isPlacingOrder} loading={isPlacingOrder}>
                  Place Order
                </Button>
              </div>
            )}
          </div>
        </div>

        <aside className="checkout-summary">
          <div className="summary-card">
            <h3>
              Order Summary
              <span className="summary-count">
                {itemCount} {pluralize(itemCount, 'item')}
              </span>
            </h3>
            <div className="summary-items">
              {items.slice(0, 3).map((item) => (
                <div key={item.productId} className="summary-item">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatINR(item.unitPricePaise * item.quantity)}</span>
                </div>
              ))}
              {items.length > 3 && (
                <div className="summary-item">
                  <span>+{items.length - 3} more items</span>
                </div>
              )}
            </div>
            <div className="summary-breakdown">
              <div className="summary-line">
                <span>Subtotal</span>
                <span>{formatINR(pricing?.subtotalPaise || 0)}</span>
              </div>
              {pricing?.discountPaise > 0 && (
                <div className="summary-line discount">
                  <span>Discount</span>
                  <span>-{formatINR(pricing.discountPaise)}</span>
                </div>
              )}
              <div className="summary-line">
                <span>Delivery</span>
                <span>{pricing?.deliveryFeePaise > 0 ? formatINR(pricing.deliveryFeePaise) : 'Free'}</span>
              </div>
              <div className="summary-line">
                <span>Tax (5%)</span>
                <span>{formatINR(pricing?.taxPaise || 0)}</span>
              </div>
              <div className="summary-line total">
                <span>Total</span>
                <span>{formatINR(pricing?.totalPaise || 0)}</span>
              </div>
            </div>
            <p className="summary-note">
              <Icon name="alert-circle" size={14} />
              Prices include GST. Final amount charged after payment confirmation.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
