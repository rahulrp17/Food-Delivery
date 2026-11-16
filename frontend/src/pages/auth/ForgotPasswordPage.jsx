import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { authApi } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import { useUiStore } from '../../stores/ui.store';
import {
  focusFirstInvalidField,
  forgotPasswordFormSchema,
  getErrorMessage,
  parseForm,
} from '../../lib/validation/forms';
import './AuthPage.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const showSuccess = useUiStore((s) => s.success);
  const showError = useUiStore((s) => s.error);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');

  const handleChange = (value) => {
    setEmail(value);
    if (errors.email) setErrors({});
    if (requestError) setRequestError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseForm(forgotPasswordFormSchema, { email });
    if (!parsed.success) {
      setErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }

    setIsLoading(true);
    setErrors({});
    setRequestError('');
    try {
      await authApi.forgotPassword(parsed.data.email);
      setSubmitted(true);
      showSuccess('If the email exists, a reset link has been sent');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to send reset email');
      setRequestError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h1>Check Your Email</h1>
            <p>If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.</p>
          </div>
          <div className="auth-actions">
            <Button onClick={() => navigate('/login')}>Back to Sign In</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth-header">
          <h1>Forgot Password</h1>
          <p>Enter your email and we'll send you a reset link</p>
        </div>

        {requestError ? (
          <div className="auth-error" role="alert">
            <Icon name="alert-circle" size={18} aria-hidden="true" />
            <span>{requestError}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="you@example.com"
              error={errors.email}
              autoComplete="email"
              disabled={isLoading}
              required
            />
          </div>

          <Button type="submit" size="lg" fullWidth loading={isLoading}>
            Send Reset Link
          </Button>
        </form>

        <p className="auth-footer">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
