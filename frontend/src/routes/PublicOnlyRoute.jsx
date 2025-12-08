import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Checking session...</div>;

  if (isAuthenticated && user) {
    if (user.role === 'subject_specialist') {
      return <Navigate to="/specialist/repository/questions" replace />;
    }
    if (user.role === 'admin') {
      return <Navigate to="/admin/exams" replace />;
    }
    if (user.role === 'school_admin') {
      return <Navigate to="/school" replace />;
    }
    if (user.role === 'student') {
      return <Navigate to="/student" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}