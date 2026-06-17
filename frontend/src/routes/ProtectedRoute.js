import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 1. Wait for Auth Context to finish initialization
  if (loading) return <div>Loading session...</div>;

  // 2. Check if logged in
  if (!isAuthenticated) {
    // Redirect public_user routes to portal login
    if (roles.includes('public_user')) {
      return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />;
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 3. Role Check
  if (roles.length && user && !roles.includes(user.role)) {
    // Redirect to the correct dashboard based on role
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "school_admin") return <Navigate to="/school" replace />;
    // FIX: Send specialist to THEIR dashboard, not admin
    if (user.role === "subject_specialist") return <Navigate to="/specialist" replace />;
    if (user.role === "student") return <Navigate to="/student" replace />;
    if (user.role === "public_user") return <Navigate to="/portal/dashboard" replace />;
    
    // Fallback
    return <Navigate to="/login" replace />;
  }

  return children;
}