import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export function ProtectedRoute({ children, allowedRoles }) {
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function GuestRoute({ children }) {
  const status = useAuthStore((s) => s.status);

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

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return children;
}