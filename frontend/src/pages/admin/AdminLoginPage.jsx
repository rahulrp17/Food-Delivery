import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import {
  adminLoginFormSchema,
  focusFirstInvalidField,
  getErrorMessage,
  mapServerErrors,
  parseForm,
} from '../../lib/validation/forms';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/ui/Icon';
import Logo from '../../components/layout/Logo';
import heroImage from '../../assets/auth-hero.webp';
import './AdminLoginPage.css';

/**
 * Split-screen admin authentication.
 *
 * Left  : cinematic food photography with the brand promise.
 * Right : the sign-in form.
 *
 * On mobile the photographic panel collapses to a compact brand band so the
 * form gets the full viewport and nothing overflows.
 */
export default function AdminLoginPage() {
  const { login, isLoading } = useAuth();
  const reduceMotion = useReducedMotion();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    if (serverError) setServerError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseForm(adminLoginFormSchema, formData);
    if (!parsed.success) {
      setErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }

    setErrors({});
    setServerError(null);
    const result = await login(parsed.data.email, parsed.data.password);
    if (result.success) {
      return;
    }

    const fieldErrors = mapServerErrors(result.details, ['email', 'password']);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      focusFirstInvalidField();
    } else {
      setServerError(getErrorMessage(result, 'Unable to sign in'));
    }
  };

  const fade = (delay) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] },
        };

  return (
    <div className="admin-login-page">
      <div className="admin-login-shell">
        {/* ---------- Photographic panel ---------- */}
        <aside className="admin-login-visual" aria-hidden="true">
          <img src={heroImage} alt="" className="admin-login-visual-img" />
          <div className="admin-login-visual-scrim" />

          <div className="admin-login-visual-content">
            <span className="admin-login-visual-eyebrow">
              <span className="admin-login-visual-dot" />
              Restaurant operations
            </span>

            <h2 className="admin-login-visual-heading">
              Your kitchen.
              <br />
              Your business.
              <br />
              <em>One powerful dashboard.</em>
            </h2>

            <p className="admin-login-visual-copy">
              Live orders, catalog, staffing and revenue — every part of your
              restaurant, in one calm place.
            </p>

            <ul className="admin-login-visual-points">
              <li>
                <Icon name="truck" size={16} label="" />
                Real-time order board
              </li>
              <li>
                <Icon name="bar-chart" size={16} label="" />
                Revenue &amp; demand analytics
              </li>
              <li>
                <Icon name="shield-check" size={16} label="" />
                Role-based staff access
              </li>
            </ul>
          </div>

          <span className="admin-login-visual-credit">Foodie Admin Pro</span>
        </aside>

        {/* ---------- Form panel ---------- */}
        <section className="admin-login-form-side">
          <div className="admin-login-form-topbar">
            <Link to="/" className="admin-login-back">
              <Icon name="arrow-left" size={16} label="" aria-hidden="true" />
              Back to store
            </Link>
            <span className="admin-login-secure">
              <Icon name="shield-check" size={14} label="" aria-hidden="true" />
              Secure access
            </span>
          </div>

          <motion.div className="admin-login-card" {...fade(0.05)}>
            <div className="admin-login-brand">
              <Logo />
            </div>

            <div className="admin-login-heading">
              <h1>Welcome back</h1>
              <p>Sign in to manage your restaurant workspace.</p>
            </div>

            {serverError ? (
              <div className="admin-login-error" role="alert">
                <Icon name="alert-circle" size={18} label="" aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="admin-login-form" noValidate>
              <div className="admin-login-field">
                <label htmlFor="email">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@foodie.local"
                  error={errors.email}
                  autoComplete="email"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="admin-login-field">
                <label htmlFor="password">Password</label>
                <div className="admin-login-password">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    error={errors.password}
                    autoComplete="current-password"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="admin-login-password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    disabled={isLoading}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} label="" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" fullWidth loading={isLoading}>
                Sign in to dashboard
              </Button>
            </form>

            <p className="admin-login-note">
              Access is restricted to authorised staff. Contact your workspace
              owner if you need an account.
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
