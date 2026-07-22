import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import ProtectedRoute from "./ProtectedRoute";
import PublicOnlyRoute from "./PublicOnlyRoute";

// Eager: entry surfaces that must paint instantly.
import Home from "../components/Home";
import Login from "../components/Login";

// Everything else is code-split so each portal (admin / school / student /
// public / quick) downloads only its own chunk — critical on school networks.
const DashboardLayout = lazy(() => import("../components/layout/DashboardLayout"));
const DashboardHome = lazy(() => import("../components/layout/DashboardHome"));
const PublicLayout = lazy(() => import("../components/layout/PublicLayout"));

const AdminExams = lazy(() => import("../components/admin/AdminExams"));
const AdminStudents = lazy(() => import("../components/admin/AdminStudents"));
const AdminSchools = lazy(() => import("../components/admin/AdminSchools"));
const SpecialistScopeManager = lazy(() => import("../components/admin/SpecialistScopeManager"));
const AdminExamQuestions = lazy(() => import("../components/admin/AdminExamQuestions"));
const AdminExamDetail = lazy(() => import("../components/admin/AdminExamDetail"));
const StudentRequests = lazy(() => import("../components/admin/StudentRequests"));
const RepoQuestionsPage = lazy(() => import("../components/repository/RepoQuestionsPage"));
const RepoQuestionEditPage = lazy(() => import("../components/repository/RepoQuestionEditPage"));
const StudentExamQuestionsPage = lazy(() => import("../components/StudentExamQuestionsPage"));
const StudentResultsPage = lazy(() => import("../components/StudentResultsPage"));
const BulkEditQuestions = lazy(() => import("../components/repository/BulkEditQuestions"));
const SpecialistActivityLog = lazy(() => import("../components/subject/SpecialistActivityLog"));
const RepoReports = lazy(() => import("../components/repository/RepoReports"));
const StudentDashboard = lazy(() => import("../components/StudentDashboard"));
const PrimaryExamFlow = lazy(() => import("../components/primary/PrimaryExamFlow"));
const StudentAnalysisPage = lazy(() => import("../components/StudentAnalysisPage"));
const ProfilePage = lazy(() => import("../components/ProfilePage"));
const SchoolAnalyticsPage = lazy(() => import("../components/admin/SchoolAnalyticsPage"));
const GamePlayPage = lazy(() => import("../components/games/GamePlayPage"));
const GamesAdminPanel = lazy(() => import("../components/admin/GamesAdminPanel"));
const ForgotPassword = lazy(() => import("../components/ForgotPassword"));

const PublicCatalog = lazy(() => import("../components/public/PublicCatalog"));
const PublicCourseDetail = lazy(() => import("../components/public/PublicCourseDetail"));
const PublicLogin = lazy(() => import("../components/public/PublicLogin"));
const PublicRegister = lazy(() => import("../components/public/PublicRegister"));
const PublicForgotPassword = lazy(() => import("../components/public/PublicForgotPassword"));
const PublicExamInterface = lazy(() => import("../components/public/PublicExamInterface"));
const PublicDashboard = lazy(() => import("../components/public/PublicDashboard"));
const PublicPractice = lazy(() => import("../components/public/PublicPractice"));
const PublicMockInterface = lazy(() => import("../components/public/PublicMockInterface"));
const PublicProfilePage = lazy(() => import("../components/public/PublicProfilePage"));
const AdminPublicManager = lazy(() => import("../components/public/AdminPublicManager"));
const ThinkletsPage = lazy(() => import("../components/public/ThinkletsPage"));

const QuickLanding = lazy(() => import("../components/quick/QuickLanding"));
const QuickExamInterface = lazy(() => import("../components/quick/QuickExamInterface"));
const QuickResults = lazy(() => import("../components/quick/QuickResults"));
const AdminQuickExams = lazy(() => import("../components/quick/AdminQuickExams"));

function RouteFallback() {
  return (
    <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
          <Route path="specialist-access" element={<SpecialistScopeManager />} />
          <Route path="requests" element={<StudentRequests />} />
          <Route path="portal" element={<AdminPublicManager initialTab={0} />} />
          <Route path="portal/subscriptions" element={<AdminPublicManager initialTab={1} />} />
          <Route path="portal/question-bank" element={<AdminPublicManager initialTab={2} />} />
          <Route path="portal/pending-images" element={<AdminPublicManager initialTab={3} />} />
          <Route path="quick" element={<AdminQuickExams />} />
          <Route path="games" element={<GamesAdminPanel />} />
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
          <Route path="games" element={<GamesAdminPanel />} />
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

        {/* Must precede the /student/* catch-all below, or the dashboard
            would swallow it. */}
        <Route path="/student/games/:key" element={
          <ProtectedRoute roles={["student"]}>
            <GamePlayPage />
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
          <Route path="profile" element={
            <ProtectedRoute roles={["public_user"]}>
              <PublicProfilePage />
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
    </Suspense>
  );
}
