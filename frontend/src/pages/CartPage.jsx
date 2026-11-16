import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { formatINR, pluralize } from '../lib/format';
import { couponCodeFormSchema, parseForm } from '../lib/validation/forms';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Icon from '../components/ui/Icon';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import './CartPage.css';

const CartSkeleton = () => (
  <div className="cart-skeleton" aria-hidden="true">
    {[...Array(3)].map((_, index) => (
      <div className="cart-item-skeleton" key={index}>
        <Skeleton width="104px" height="104px" radius="16px" />
        <div className="skeleton-lines">
          <Skeleton width="24%" height="10px" />
          <Skeleton width="58%" height="20px" />
          <Skeleton width="34%" height="12px" />
        </div>
        <Skeleton width="76px" height="24px" radius="999px" />
      </div>
    ))}
  </div>
);

export default function CartPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const {
    items,
    pricing,
    coupon,
    isLoading,
    error,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    clear,
    refresh,
    isUpdating,
    updatingProductId,
    isRemoving,
    isClearing,
    isApplyingCoupon,
  } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = () => {
    const result = parseForm(couponCodeFormSchema, { code: couponCode });
    if (!result.success) {
      setCouponError(result.errors.code || 'Enter a valid coupon code');
      return;
    }
    setCouponError('');
    applyCoupon(result.data.code);
  };

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotalPaise =
    pricing?.subtotalPaise ??
    items.reduce((total, item) => total + (item.unitPricePaise || 0) * item.quantity, 0);
  const freeThreshold = pricing?.freeDeliveryThresholdPaise || 0;
  const freeRemaining = Math.max(0, freeThreshold - subtotalPaise);
  const freeProgress = freeThreshold
    ? Math.min(100, Math.round((subtotalPaise / freeThreshold) * 100))
    : 100;

  const itemMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      };
  const itemTransition = { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] };

  if (isLoading) {
    return (
      <div className="cart-page">
        <header className="cart-hero">
          <div>
            <p className="eyebrow">Your order</p>
            <h1>Your cart</h1>
            <p className="cart-subtitle">Gathering your dishes from the kitchen.</p>
          </div>
        </header>
        <div className="cart-layout">
          <CartSkeleton />
          <div className="skeleton cart-summary-skeleton" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-page cart-page-empty">
        <header className="cart-hero">
          <div>
            <p className="eyebrow">Your order</p>
            <h1>Your cart</h1>
            <p className="cart-subtitle">
              We could not load your cart right now. Please try again.
            </p>
          </div>
        </header>
        <div className="cart-empty-shell">
          <ErrorState
            headingLevel="h2"
            title="Unable to load cart"
            description={error.message || "Please try again in a moment."}
            onRetry={refresh}
          />
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="cart-page cart-page-empty">
        <header className="cart-hero">
          <div>
            <p className="eyebrow">Your order</p>
            <h1>Your cart</h1>
            <p className="cart-subtitle">
              Nothing here yet. Pick a few dishes and we will take it from there.
            </p>
          </div>
        </header>
        <div className="cart-empty-shell">
          <EmptyState
            icon="shopping-bag"
            headingLevel="h2"
            title="Your cart is empty"
            description="Browse the menu and add something worth looking forward to."
            actions={
              <Button to="/menu" iconRight={<Icon name="arrow-right" size={17} />}>
                Explore the menu
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <header className="cart-hero">
        <div className="cart-hero-copy">
          <p className="eyebrow">Your order</p>
          <h1>Your cart</h1>
          <p className="cart-subtitle">
            Review your picks, adjust quantities, and checkout when everything looks right.
          </p>
        </div>
        <div className="cart-hero-meta">
          <span className="cart-count-pill">
            <Icon name="shopping-bag" size={16} />
            {itemCount} {pluralize(itemCount, 'item')}
          </span>
          <Link to="/menu" className="cart-back-link">
            <Icon name="chevron-left" size={16} />
            Keep browsing
          </Link>
        </div>
      </header>

      <div className="cart-layout">
        <section className="cart-items" aria-label="Cart items">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const lineTotalPaise =
                item.lineTotalPaise ?? (item.unitPricePaise || 0) * item.quantity;
              const maxQuantity = item.maxQuantity || 10;
              const busy = isUpdating && updatingProductId === item.productId;
              const atMax = item.quantity >= maxQuantity;

              return (
                <motion.article
                  className="cart-item"
                  key={item.productId}
                  layout={!reduceMotion}
                  initial={itemMotion.initial}
                  animate={itemMotion.animate}
                  exit={itemMotion.exit}
                  transition={itemTransition}
                >
                  <Link
                    to={item.slug ? `/product/${item.slug}` : '/menu'}
                    className="cart-item-image-link"
                    aria-label={`View ${item.name}`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="cart-item-image"
                        loading="lazy"
                      />
                    ) : (
                      <span className="cart-item-image cart-item-image-fallback">
                        <Icon name="chef-hat" size={24} />
                      </span>
                    )}
                  </Link>

                  <div className="cart-item-details">
                    <span className="cart-item-category">Kitchen fresh</span>
                    <Link
                      to={item.slug ? `/product/${item.slug}` : '/menu'}
                      className="cart-item-name"
                    >
                      {item.name}
                    </Link>
                    <span className="cart-item-unit">
                      {formatINR(item.unitPricePaise)} each
                    </span>
                    {item.isAvailable === false ? (
                      <span className="cart-item-unavailable">Unavailable</span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="cart-item-remove"
                    onClick={() => removeItem(item.productId)}
                    disabled={isRemoving}
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    <Icon name="trash" size={18} />
                  </button>

                  <div className="cart-item-controls">
                    <div className="quantity-stepper" role="group" aria-label={`Quantity for ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        disabled={busy || item.quantity <= 1}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Icon name="minus" size={15} />
                      </button>
                      <span className="quantity-value" aria-live="polite">
                        {busy ? <Icon name="spinner" className="spinner-animate" size={14} /> : item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={busy || atMax || item.isAvailable === false}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Icon name="plus" size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-total">
                    <span>Line total</span>
                    <strong aria-live="polite">{formatINR(lineTotalPaise)}</strong>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          <div className="cart-list-note">
            <Icon name="leaf" size={16} />
            Every dish is cooked after you order. Nothing sits under a heat lamp.
          </div>
        </section>

        <aside className="cart-summary" aria-label="Order summary">
          <div className="cart-summary-card">
            <div className="cart-summary-head">
              <span className="cart-summary-eyebrow">Order summary</span>
              <span className="cart-summary-count">
                {itemCount} {pluralize(itemCount, 'item')}
              </span>
            </div>

            {freeThreshold > 0 ? (
              <div className={`delivery-meter ${freeRemaining === 0 ? 'is-complete' : ''}`}>
                <p>
                  <Icon name={freeRemaining === 0 ? 'check' : 'truck'} size={16} />
                  {freeRemaining === 0
                    ? 'Free delivery unlocked'
                    : `Add ${formatINR(freeRemaining)} more for free delivery`}
                </p>
                <span className="delivery-meter-track" aria-hidden="true">
                  <motion.span
                    initial={false}
                    animate={{ scaleX: freeProgress / 100 }}
                    style={{ originX: 0, originY: 0.5 }}
                    transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
              </div>
            ) : null}

            <div className="cart-summary-lines">
              <div className="cart-summary-line">
                <span>Subtotal</span>
                <span>{formatINR(subtotalPaise)}</span>
              </div>
              {coupon ? (
                <div className="cart-summary-line discount">
                  <span>Discount ({coupon.code})</span>
                  <span>-{formatINR(pricing?.discountPaise || 0)}</span>
                </div>
              ) : null}
              <div className="cart-summary-line">
                <span>Delivery</span>
                <span>
                  {pricing?.deliveryFeePaise > 0
                    ? formatINR(pricing.deliveryFeePaise)
                    : 'Free'}
                </span>
              </div>
              <div className="cart-summary-line">
                <span>Tax (5%)</span>
                <span>{formatINR(pricing?.taxPaise || 0)}</span>
              </div>
              <div className="cart-summary-line total" aria-live="polite">
                <span>Total</span>
                <span>{formatINR(pricing?.totalPaise || 0)}</span>
              </div>
            </div>

            <div className="coupon-section">
              <label htmlFor="coupon-code" className="visually-hidden">
                Coupon code
              </label>
              <div className="coupon-input-wrapper">
                <Input
                  id="coupon-code"
                  type="text"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(event) => {
                    setCouponCode(event.target.value.toUpperCase());
                    if (couponError) setCouponError('');
                  }}
                  disabled={isApplyingCoupon}
                  aria-label="Coupon code"
                  error={couponError}
                />
                {coupon ? (
                  <button
                    type="button"
                    className="btn-remove-coupon"
                    onClick={removeCoupon}
                    disabled={isApplyingCoupon}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-apply-coupon"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponCode.trim()}
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>

            <Button
              className="checkout-button"
              size="lg"
              fullWidth
              onClick={() => navigate('/checkout')}
            >
              Proceed to checkout
              <Icon name="arrow-right" size={18} />
            </Button>

            <p className="secure-note">
              <Icon name="shield-check" size={16} />
              Secure checkout powered by Stripe
            </p>
          </div>
        </aside>
      </div>

      <div className="cart-footer">
        <Button
          variant="ghost"
          onClick={clear}
          iconLeft={<Icon name="trash" size={16} />}
          disabled={isClearing}
        >
          Clear cart
        </Button>
        <Link to="/menu" className="continue-shopping">
          Continue shopping
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    </div>
  );
}
