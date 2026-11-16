import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { paymentsApi } from '../api/payments.api';
import { ordersApi } from '../api/orders.api';
import Button from '../components/ui/Button';
import './VerifyPage.css';

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const verifyPayment = async (sessionId, attempt = 0) => {
      try {
        const payment = await paymentsApi.getSession(sessionId);
        if (cancelled) return;
        setOrderId(payment.orderId);

        if (payment.paymentStatus === 'paid') {
          setStatus('success');
          return;
        }

        if (payment.paymentStatus === 'failed' || payment.sessionStatus === 'expired') {
          setStatus('failed');
          return;
        }

        if (payment.sessionStatus === 'complete' && attempt < 10) {
          setStatus('pending');
          timer = setTimeout(() => verifyPayment(sessionId, attempt + 1), 2000);
          return;
        }

        setStatus('pending');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    const checkOrderStatus = async (id) => {
      try {
        const res = await ordersApi.get(id);
        if (cancelled) return;
        const order = res.order;
        setStatus(
          order.paymentStatus === 'paid'
            ? 'success'
            : order.paymentStatus === 'failed'
              ? 'failed'
              : 'pending'
        );
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    const session_id = searchParams.get('session_id');
    const order_id = searchParams.get('order_id');

    if (session_id) {
      verifyPayment(session_id);
    } else if (order_id) {
      setOrderId(order_id);
      checkOrderStatus(order_id);
    } else {
      setStatus('error');
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchParams]);

  const handleGoToOrders = () => navigate(orderId ? `/orders/${orderId}` : '/orders');
  const handleGoHome = () => navigate('/');

  const statusConfig = {
    loading: {
      icon: 'loader',
      title: 'Verifying Payment',
      description: 'Please wait while we confirm your payment...',
      showSpinner: true,
    },
    success: {
      icon: 'check-circle',
      title: 'Payment Successful!',
      description: 'Your order has been confirmed and is being prepared.',
      showSpinner: false,
    },
    failed: {
      icon: 'x-circle',
      title: 'Payment Failed',
      description: 'Your payment could not be processed. Please try again.',
      showSpinner: false,
    },
    pending: {
      icon: 'clock',
      title: 'Payment Pending',
      description: 'Your payment is being processed. Please check back shortly.',
      showSpinner: false,
    },
    error: {
      icon: 'alert-triangle',
      title: 'Unable to Verify',
      description: 'We couldn\'t verify your payment status. Please check your orders.',
      showSpinner: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-icon">
          {config.showSpinner ? (
            <div className="spinner" />
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {config.icon === 'check-circle' && (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" />
                </>
              )}
              {config.icon === 'x-circle' && (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </>
              )}
              {config.icon === 'clock' && (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </>
              )}
              {config.icon === 'alert-triangle' && (
                <>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </>
              )}
            </svg>
          )}
        </div>

        <h1 className="verify-title">{config.title}</h1>
        <p className="verify-description">{config.description}</p>

        {orderId && (
          <div className="verify-order-id">
            Order <strong>#{orderId.slice(-8).toUpperCase()}</strong>
          </div>
        )}

        <div className="verify-actions">
          {status === 'success' && (
            <>
              <Button size="lg" onClick={handleGoToOrders}>
                View Order
              </Button>
              <Button variant="outline" size="lg" onClick={handleGoHome}>
                Continue Shopping
              </Button>
            </>
          )}
          {status === 'failed' && (
            <>
              <Button size="lg" onClick={() => navigate('/checkout')}>
                Try Again
              </Button>
              <Button variant="outline" size="lg" onClick={handleGoHome}>
                Go Home
              </Button>
            </>
          )}
          {status === 'pending' && (
            <>
              <Button size="lg" onClick={handleGoToOrders}>
                Check Order Status
              </Button>
              <Button variant="outline" size="lg" onClick={handleGoHome}>
                Go Home
              </Button>
            </>
          )}
          {status === 'error' && (
            <Button size="lg" onClick={handleGoToOrders}>
              View My Orders
            </Button>
          )}
          {status === 'loading' && (
            <div className="verify-loading-hint">
              If this takes too long, <a href="/orders">check your orders</a>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}