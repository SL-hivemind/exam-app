import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PublicOnlyRoute from "./PublicOnlyRoute";

// NEW Unified Layout
import DashboardLayout from "../components/layout/DashboardLayout";

// Sub-pages (Keep these exactly as they are)
import AdminExams from "../components/admin/AdminExams";
import AdminStudents from "../components/admin/AdminStudents";
import AdminSchools from "../components/admin/AdminSchools";
import AdminExamQuestions from "../components/admin/AdminExamQuestions";
import AdminExamDetail from "../components/admin/AdminExamDetail";
import RepoQuestionsPage from "../components/repository/RepoQuestionsPage";
import RepoQuestionEditPage from "../components/repository/RepoQuestionEditPage";
import StudentExamQuestionsPage from "../components/StudentExamQuestionsPage";
import StudentResultsPage from "../components/StudentResultsPage";
import BulkEditQuestions from "../components/repository/BulkEditQuestions";
import SpecialistActivityLog from "../components/subject/SpecialistActivityLog";
import StudentDashboard from "../components/StudentDashboard";
import PrimaryExamFlow from "../components/primary/PrimaryExamFlow";
import StudentAnalysisPage from "../components/StudentAnalysisPage";
import ProfilePage from "../components/ProfilePage";

// Auth
import Login from "../components/Login";
import Home from "../components/Home";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

      {/* --- 1. ADMIN ROUTES (Wrapped in New Layout) --- */}
      <Route path="/admin" element={
        <ProtectedRoute roles={["admin"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="exams" replace />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="exams/:examId" element={<AdminExamDetail />} />
        <Route path="exams/:examId/questions" element={<AdminExamQuestions />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="schools" element={<AdminSchools />} />
        <Route path="repository/questions" element={<RepoQuestionsPage />} />
        <Route path="repository/questions/new" element={<RepoQuestionEditPage />} />
        <Route path="repository/questions/:id/edit" element={<RepoQuestionEditPage />} />
        <Route path="repository/bulk-edit" element={<BulkEditQuestions />} />
        <Route path="activity-log" element={<SpecialistActivityLog />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* --- 2. SCHOOL ROUTES (Wrapped in New Layout) --- */}
      <Route path="/school" element={
        <ProtectedRoute roles={["school_admin"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="students" replace />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="exams/:examId" element={<AdminExamDetail />} />
        <Route path="exams/:examId/questions" element={<AdminExamQuestions />} />
        <Route path="repository/questions" element={<RepoQuestionsPage />} />
        <Route path="repository/questions/new" element={<RepoQuestionEditPage />} />
        <Route path="repository/questions/:id/edit" element={<RepoQuestionEditPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* --- 3. SPECIALIST ROUTES (Wrapped in New Layout) --- */}
      <Route path="/specialist" element={
        <ProtectedRoute roles={["subject_specialist"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="repository/questions" replace />} />
        <Route path="repository/questions" element={<RepoQuestionsPage />} />
        <Route path="repository/questions/new" element={<RepoQuestionEditPage />} />
        <Route path="repository/questions/:id/edit" element={<RepoQuestionEditPage />} />
        <Route path="repository/bulk-edit" element={<BulkEditQuestions />} />
        <Route path="activity-log" element={<SpecialistActivityLog />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* --- 4. STUDENT DASHBOARD --- */}
      <Route path="/student/analysis" element={
        <ProtectedRoute roles={["student"]}>
          <StudentAnalysisPage />
        </ProtectedRoute>
      } />

      <Route path="/student/profile" element={
        <ProtectedRoute roles={["student"]}>
          <ProfilePage />
        </ProtectedRoute>
      } />

      <Route path="/student/*" element={
        <ProtectedRoute roles={["student"]}>
          <StudentDashboard />
        </ProtectedRoute>
      } />

      {/* --- 5. STUDENT ACTIVE EXAM & RESULTS --- */}
      <Route path="/exams/:examId/questions" element={
        <ProtectedRoute roles={["student"]}>
          <StudentExamQuestionsPage />
        </ProtectedRoute>
      } />

      <Route path="/exam/:examId/results" element={
        <ProtectedRoute roles={["student"]}>
          <StudentResultsPage />
        </ProtectedRoute>
      } />

      <Route path="/primary" element={<PrimaryExamFlow />} />

      {/* --- FALLBACKS --- */}
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
