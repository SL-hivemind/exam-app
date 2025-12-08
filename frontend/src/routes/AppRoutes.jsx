import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PublicOnlyRoute from "./PublicOnlyRoute";

// Dashboards
import AdminDashboard from "../components/admin/AdminDashboard";
import SchoolDashboard from "../components/school/SchoolDashboard";
import SubjectSpecialistDashboard from "../components/subject/SubjectSpecialistDashboard"; 
import StudentDashboard from "../components/StudentDashboard";

// Admin Sub-pages
import AdminExams from "../components/admin/AdminExams";
import AdminStudents from "../components/admin/AdminStudents";
import AdminSchools from "../components/admin/AdminSchools";
import AdminExamQuestions from "../components/admin/AdminExamQuestions";
import AdminExamDetail from "../components/admin/AdminExamDetail";

// Repository Pages
import RepoQuestionsPage from "../components/repository/RepoQuestionsPage";
import RepoQuestionEditPage from "../components/repository/RepoQuestionEditPage";

// Student Exam Pages (Ensure these are imported!)
//import StudentExamPage from "../components/StudentExamPage";
import StudentExamQuestionsPage from "../components/StudentExamQuestionsPage";
import StudentResultsPage from "../components/StudentResultsPage";
import BulkEditQuestions from "../components/repository/BulkEditQuestions";
import SpecialistActivityLog from "../components/subject/SpecialistActivityLog";

// Auth
import Login from "../components/Login";
import Home from "../components/Home";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

      {/* --- 1. ADMIN DASHBOARD (Admin Only) --- */}
      <Route path="/admin/*" element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
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
      </Route>

      {/* --- 2. SCHOOL DASHBOARD (School Admin Only) --- */}
      <Route path="/school/*" element={
          <ProtectedRoute roles={["school_admin"]}>
            <SchoolDashboard />
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
      </Route>

      {/* --- 3. SPECIALIST DASHBOARD --- */}
      <Route path="/specialist/*" element={
          <ProtectedRoute roles={["subject_specialist"]}>
            <SubjectSpecialistDashboard />
          </ProtectedRoute>
      }>
        <Route index element={<Navigate to="repository/questions" replace />} />
        <Route path="repository/questions" element={<RepoQuestionsPage />} />
        <Route path="repository/questions/new" element={<RepoQuestionEditPage />} />
        <Route path="repository/questions/:id/edit" element={<RepoQuestionEditPage />} />
        <Route path="repository/bulk-edit" element={<BulkEditQuestions />} />
        <Route path="activity-log" element={<SpecialistActivityLog />} />
      </Route>

      {/* --- 4. STUDENT DASHBOARD --- */}
      <Route path="/student/*" element={
          <ProtectedRoute roles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
      } />

      {/* --- 5. STUDENT ACTIVE EXAM & RESULTS (Critical Addition) --- */}
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

      {/* --- FALLBACKS --- */}
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}