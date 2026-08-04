import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <img src="/Sl-metalic-png.png" alt="" width={80} height={80} style={{ objectFit: 'contain', animation: 'pulse 1.6s ease-in-out infinite' }} />
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.06);opacity:1}}`}</style>
    </div>
  );

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