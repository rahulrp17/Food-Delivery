
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userRole = localStorage.getItem('role');
  return allowedRoles.includes(userRole)
    ? children
    : <Navigate to="/" replace />;
};

export default ProtectedRoute;
