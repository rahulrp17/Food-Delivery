import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { registerFormSchema, toFieldErrors } from '../../lib/validation/auth';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AuthSplit from '../../components/auth/AuthSplit';

const mapServerErrors = (details) =>
  (Array.isArray(details) ? details : []).reduce((errors, detail) => {
    const field = detail?.field?.split('.').pop();
    if (field && ['name', 'email', 'password'].includes(field) && !errors[field]) {
      errors[field] = detail.message;
    }
    return errors;
  }, {});

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    if (authError) setAuthError('');
  };

  const validate = () => {
    const parsed = registerFormSchema.safeParse(formData);
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

    const result = await register(data.name, data.email, data.password);
    if (result.success) {
      navigate('/', { replace: true });
      return;
    }

    const serverErrors = mapServerErrors(result.details);
    if (result.status === 409) serverErrors.email = result.message;
    if (Object.keys(serverErrors).length > 0) {
      setErrors(serverErrors);
    } else {
      // The toast is transient, so the failure is also shown inline.
      setAuthError(result.message || 'We could not create your account. Please try again.');
    }
  };

  return (
    <AuthSplit
      heading={<>Create{' '}<span className="accent">account</span></>}
      lead="Join us to start ordering"
      error={authError}
      footer={
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="auth-field">
          <Input
            aria-label="Full name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Full name"
            error={errors.name}
            autoComplete="name"
            disabled={isLoading}
            required
            className="auth-input"
            leadingIcon={
              <Icon name="user" size={17} strokeWidth={1.5} style={{ color: '#94a3b8' }} />
            }
          />
        </div>

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
            placeholder={showPassword ? 'Password' : '••••••••'}
            error={errors.password}
            autoComplete="new-password"
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
          <p className="field-hint">
            At least 8 characters with a letter and number
          </p>
        </div>

        <div className="auth-field">
          <Input
            aria-label="Confirm password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder={showConfirmPassword ? 'Confirm password' : '••••••••'}
            error={errors.confirmPassword}
            autoComplete="new-password"
            disabled={isLoading}
            required
            className="auth-input"
            trailingButton
            trailingAriaLabel={
              showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
            }
            onTrailingClick={() => setShowConfirmPassword((prev) => !prev)}
            trailing={
              <Icon
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={16}
                strokeWidth={1.3}
              />
            }
          />
        </div>

        <Button type="submit" size="lg" fullWidth loading={isLoading}>
          Create Account
        </Button>
      </form>
    </AuthSplit>
  );
}
