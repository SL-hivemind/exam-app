// src/routes/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import Home from '../components/Home';
import Login from '../components/Login';
import RegisterStudent from '../components/RegisterStudent';
import StudentDashboard from '../components/StudentDashboard';
import StudentExamPage from '../components/StudentExamPage';
import StudentExamQuestionsPage from '../components/StudentExamQuestionsPage';
import StudentResultsPage from '../components/StudentResultsPage';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminSchools from '../components/admin/AdminSchools';
import AdminExams from '../components/admin/AdminExams';
import ProtectedRoute from './ProtectedRoute';

function StudentExamPageWrapper() {
  const { examId } = useParams();
  return <StudentExamPage examId={examId} />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterStudent />} />
      <Route
        path="/dashboard/student"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/:examId"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentExamPageWrapper />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exams/:examId/questions"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentExamQuestionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/:examId/results"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/schools"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminSchools />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminExams />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
