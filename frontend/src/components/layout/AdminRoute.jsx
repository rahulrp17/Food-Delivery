import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export function AdminRoute({ children }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return <AdminForbiddenPage />;
  }

  return children;
}

export function PermissionRoute({ permission, children }) {
  const user = useAuthStore((s) => s.user);
  const hasExplicitPermissions = Array.isArray(user?.permissions);
  const allowed = hasExplicitPermissions
    ? user.permissions.includes(permission)
    : user?.role === 'admin';

  if (!allowed) {
    return (
      <AdminForbiddenPage
        title="Access restricted"
        message="Your account does not have permission to view this section."
      />
    );
  }

  return children;
}

export function AdminForbiddenPage({
  title = 'Access Denied',
  message = 'You need administrator privileges to access this area.',
}) {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        padding: 'var(--space-8)',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <div
        className="skeleton"
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--danger-100)',
          marginBottom: 'var(--space-4)',
        }}
        aria-hidden="true"
      />
      <h1 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-h1)' }}>{title}</h1>
      <p style={{ marginBottom: 'var(--space-6)', color: 'var(--color-text-muted)', maxWidth: 400 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Link
          to="/"
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
          }}
        >
          Back to Store
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function AdminLoginGuard({ children }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const location = useLocation();

  // Only the initial session check (before bootstrap settles) hides the form.
  // A submit also flips the status to "loading"; unmounting the page then used
  // to wipe the typed credentials and the inline server error, so a suspended
  // account saw the form reset instead of "This account has been suspended".
  if (!bootstrapped && status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
      </div>
    );
  }

  if (status === 'authenticated' && user?.role === 'admin') {
    const from = location.state?.from?.pathname;
    return <Navigate to={from && from !== '/admin/login' ? from : '/admin'} replace />;
  }

  return children;
}