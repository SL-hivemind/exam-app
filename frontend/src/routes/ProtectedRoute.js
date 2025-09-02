// src/routes/ProtectedRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [user, isAuthenticated]);

  if (isLoading) return <div>Loading...</div>; // Prevent premature redirect

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login...');
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }

  if (roles && (!user || !roles.includes(user.role))) {
    console.log('Role not allowed, redirecting to login...', user);
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }

  console.log('Access granted to:', window.location.pathname, user);
  return children;
}