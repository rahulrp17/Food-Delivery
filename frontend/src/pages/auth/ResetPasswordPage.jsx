import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { authApi } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import { useUiStore } from '../../stores/ui.store';
import {
  focusFirstInvalidField,
  getErrorMessage,
  parseForm,
  resetPasswordFormSchema,
} from '../../lib/validation/forms';
import './AuthPage.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const showSuccess = useUiStore((s) => s.success);
  const showError = useUiStore((s) => s.error);

  const token = searchParams.get('token');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [validToken, setValidToken] = useState(Boolean(token));
  const [requestError, setRequestError] = useState('');

  useEffect(() => {
    if (!token) setValidToken(false);
  }, [token]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (requestError) setRequestError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseForm(resetPasswordFormSchema, form);
    if (!parsed.success) {
      setErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }
    if (!token) {
      setValidToken(false);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setRequestError('');
    try {
      await authApi.resetPassword(token, parsed.data.password);
      showSuccess('Password has been reset successfully');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to reset password');
      if (message.toLowerCase().includes('token') || message.toLowerCase().includes('expired')) {
        setValidToken(false);
      } else {
        setRequestError(message);
        showError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!validToken) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1>Invalid Reset Link</h1>
            <p>This password reset link is invalid or has expired.</p>
          </div>
          <div className="auth-actions">
            <Button onClick={() => navigate('/forgot-password')}>Request New Link</Button>
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
          <h1>Reset Password</h1>
          <p>Enter your new password below</p>
        </div>

        {requestError ? (
          <div className="auth-error" role="alert">
            <Icon name="alert-circle" size={18} aria-hidden="true" />
            <span>{requestError}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-field">
            <label htmlFor="password">New Password</label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="••••••••"
              error={errors.password}
              autoComplete="new-password"
              disabled={isLoading}
              required
            />
            <p className="field-hint">At least 8 characters with a letter and number</p>
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="••••••••"
              error={errors.confirmPassword}
              autoComplete="new-password"
              disabled={isLoading}
              required
            />
          </div>

          <Button type="submit" size="lg" fullWidth loading={isLoading}>
            Reset Password
          </Button>
        </form>

        <p className="auth-footer">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
