// src/routes/PublicOnlyRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    // If logged in, redirect away from the public page to their dashboard
    const redirectTo = user.role === 'admin' ? '/dashboard/admin' : '/dashboard/student';
    return <Navigate to={redirectTo} replace />;
  }

  return children; // If not logged in, show the page (Login, Register)
}