import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loginFormSchema, toFieldErrors } from '../../lib/validation/auth';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AuthSplit from '../../components/auth/AuthSplit';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    if (authError) setAuthError('');
  };

  const validate = () => {
    const parsed = loginFormSchema.safeParse(formData);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error.issues));
      return null;
    }
    setErrors({});
    return parsed.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = validate();
    if (!data) return;

    const result = await login(data.email, data.password);
    if (result.success) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
      return;
    }

    // The toast is transient, so the failure is also shown inline.
    setAuthError(result.message || 'We could not sign you in. Please try again.');
  };

  return (
    <AuthSplit
      heading={<>Welcome{' '}<span className="accent">User</span></>}
      lead="Sign in to track orders, save your favourites and check out faster."
      error={authError}
      footer={
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="auth-field">
          <Input
            aria-label="Email address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email Id"
            error={errors.email}
            autoComplete="email"
            disabled={isLoading}
            required
            className="auth-input"
            leadingIcon={
              <Icon name="mail" size={17} strokeWidth={1.5} style={{ color: '#94a3b8' }} />
            }
          />
        </div>

        <div className="auth-field">
          <Input
            aria-label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            error={errors.password}
            autoComplete="current-password"
            disabled={isLoading}
            required
            className="auth-input"
            trailingButton
            trailingAriaLabel={showPassword ? 'Hide password' : 'Show password'}
            onTrailingClick={() => setShowPassword((prev) => !prev)}
            trailing={
              <Icon
                name={showPassword ? 'eye-off' : 'eye'}
                size={16}
                strokeWidth={1.3}
              />
            }
          />
        </div>

        <div className="field-options">
          <label className="remember">
            <input type="checkbox" defaultChecked className="checkbox" aria-label="Remember me" />
            Remember me
          </label>
          <Link to="/forgot-password" className="recover">
            Recover Password
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={isLoading}>
          Login
        </Button>
      </form>
    </AuthSplit>
  );
}
