import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PublicOnlyRoute from "./PublicOnlyRoute";

// NEW Unified Layout
import DashboardLayout from "../components/layout/DashboardLayout";
import DashboardHome from "../components/layout/DashboardHome";
import PublicLayout from "../components/layout/PublicLayout";

// Sub-pages (Keep these exactly as they are)
import AdminExams from "../components/admin/AdminExams";
import AdminStudents from "../components/admin/AdminStudents";
import AdminSchools from "../components/admin/AdminSchools";
import AdminExamQuestions from "../components/admin/AdminExamQuestions";
import AdminExamDetail from "../components/admin/AdminExamDetail";
import StudentRequests from "../components/admin/StudentRequests";
import RepoQuestionsPage from "../components/repository/RepoQuestionsPage";
import RepoQuestionEditPage from "../components/repository/RepoQuestionEditPage";
import StudentExamQuestionsPage from "../components/StudentExamQuestionsPage";
import StudentResultsPage from "../components/StudentResultsPage";
import BulkEditQuestions from "../components/repository/BulkEditQuestions";
import SpecialistActivityLog from "../components/subject/SpecialistActivityLog";
import RepoReports from "../components/repository/RepoReports";
import StudentDashboard from "../components/StudentDashboard";
import PrimaryExamFlow from "../components/primary/PrimaryExamFlow";
import StudentAnalysisPage from "../components/StudentAnalysisPage";
import ProfilePage from "../components/ProfilePage";

import SchoolAnalyticsPage from "../components/admin/SchoolAnalyticsPage";

// Auth
import Login from "../components/Login";
import ForgotPassword from "../components/ForgotPassword";
import Home from "../components/Home";

// Public Exam Section
import PublicCatalog from "../components/public/PublicCatalog";
import PublicCourseDetail from "../components/public/PublicCourseDetail";
import PublicLogin from "../components/public/PublicLogin";
import PublicRegister from "../components/public/PublicRegister";
import PublicForgotPassword from "../components/public/PublicForgotPassword";
import PublicExamInterface from "../components/public/PublicExamInterface";
import PublicDashboard from "../components/public/PublicDashboard";
import PublicPractice from "../components/public/PublicPractice";
import PublicMockInterface from "../components/public/PublicMockInterface";
import AdminPublicManager from "../components/public/AdminPublicManager";
import ThinkletsPage from "../components/public/ThinkletsPage";

// Quick Exam Section (Module 3)
import QuickLanding from "../components/quick/QuickLanding";
import QuickExamInterface from "../components/quick/QuickExamInterface";
import QuickResults from "../components/quick/QuickResults";
import AdminQuickExams from "../components/quick/AdminQuickExams";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* --- 1. ADMIN ROUTES (Wrapped in New Layout) --- */}
      <Route path="/admin" element={
        <ProtectedRoute roles={["admin"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardHome />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="exams/:examId" element={<AdminExamDetail />} />
        <Route path="exams/:examId/questions" element={<AdminExamQuestions />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="schools" element={<AdminSchools />} />
        <Route path="repository/questions" element={<RepoQuestionsPage />} />
        <Route path="repository/questions/new" element={<RepoQuestionEditPage />} />
        <Route path="repository/questions/:id/edit" element={<RepoQuestionEditPage />} />
        <Route path="repository/bulk-edit" element={<BulkEditQuestions />} />
        <Route path="repository/reports" element={<RepoReports />} />
        <Route path="activity-log" element={<SpecialistActivityLog />} />
        <Route path="requests" element={<StudentRequests />} />
        <Route path="portal" element={<AdminPublicManager initialTab={0} />} />
        <Route path="portal/subscriptions" element={<AdminPublicManager initialTab={1} />} />
        <Route path="portal/question-bank" element={<AdminPublicManager initialTab={2} />} />
        <Route path="portal/pending-images" element={<AdminPublicManager initialTab={3} />} />
        <Route path="quick" element={<AdminQuickExams />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* --- 2. SCHOOL ROUTES (Wrapped in New Layout) --- */}
      <Route path="/school" element={
        <ProtectedRoute roles={["school_admin"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardHome />} />
        <Route path="analysis" element={<SchoolAnalyticsPage />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="exams/:examId" element={<AdminExamDetail />} />
        <Route path="exams/:examId/questions" element={<AdminExamQuestions />} />
        <Route path="repository/questions" element={<RepoQuestionsPage />} />
        <Route path="repository/questions/new" element={<RepoQuestionEditPage />} />
        <Route path="repository/questions/:id/edit" element={<RepoQuestionEditPage />} />
        <Route path="requests" element={<StudentRequests />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* --- 3. SPECIALIST ROUTES (Wrapped in New Layout) --- */}
      <Route path="/specialist" element={
        <ProtectedRoute roles={["subject_specialist"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardHome />} />
        <Route path="repository/questions" element={<RepoQuestionsPage />} />
        <Route path="repository/questions/new" element={<RepoQuestionEditPage />} />
        <Route path="repository/questions/:id/edit" element={<RepoQuestionEditPage />} />
        <Route path="repository/bulk-edit" element={<BulkEditQuestions />} />
        <Route path="repository/reports" element={<RepoReports />} />
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

      {/* --- 6. PUBLIC EXAM ROUTES (with shared top-nav layout) --- */}
      <Route path="/public" element={<PublicLayout />}>
        <Route index element={<PublicCatalog />} />
        <Route path="course/:courseId" element={<PublicCourseDetail />} />
        <Route path="login" element={<PublicLogin />} />
        <Route path="register" element={<PublicRegister />} />
        <Route path="forgot-password" element={<PublicForgotPassword />} />
        <Route path="dashboard" element={
          <ProtectedRoute roles={["public_user"]}>
            <PublicDashboard />
          </ProtectedRoute>
        } />
        <Route path="practice" element={
          <ProtectedRoute roles={["public_user"]}>
            <PublicPractice />
          </ProtectedRoute>
        } />
        <Route path="mock" element={
          <ProtectedRoute roles={["public_user"]}>
            <PublicMockInterface />
          </ProtectedRoute>
        } />
      </Route>

      {/* Public exam viewer (full-screen, no layout wrapper) */}
      <Route path="/public/viewer/:contentId" element={<PublicExamInterface />} />

      {/* --- 7. QUICK EXAM ROUTES (zero-auth, no layout) --- */}
      <Route path="/quick" element={<QuickLanding />} />
      <Route path="/quick/:code" element={<QuickLanding />} />
      <Route path="/quick/:code/exam" element={<QuickExamInterface />} />
      <Route path="/quick/:code/results" element={<QuickResults />} />

      {/* --- 8. THINKLETS PAGE --- */}
      <Route path="/thinklets" element={<ThinkletsPage />} />

      {/* --- FALLBACKS --- */}
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

