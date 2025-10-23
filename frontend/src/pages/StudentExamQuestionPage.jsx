import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { Alert, Button } from "@mui/material";

function StudentExamQuestionPage({ examId }) {
  const [attempt, setAttempt] = useState(null);
  const [canStart, setCanStart] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAttempt() {
      try {
        // endpoint should return existing attempt or null and include exam.duration (minutes)
        const res = await api.get(`/exams/${examId}/attempt`); 
        const data = res.data || {};
        const a = data.attempt || null;
        const exam = data.exam || {};
        setAttempt(a);

        if (!a) {
          // no attempt yet -> can start
          setCanStart(true);
          setMessage("");
          return;
        }

        // attempt exists - compute expiry
        const startedAt = a.started_at ? new Date(a.started_at).getTime() : null;
        const durMs = (exam.duration || a.duration || 0) * 60 * 1000;
        const endTime = startedAt ? startedAt + durMs : null;
        const now = Date.now();

        if (a.submitted_at || a.status === "submitted") {
          setCanStart(false);
          setMessage("Exam completed — wait for results.");
        } else if (endTime && now > endTime) {
          // expired: don't allow start, show message
          setCanStart(false);
          setMessage("Exam time finished — your attempt is completed. Wait for results.");
        } else {
          // attempt in progress and still within duration -> resume allowed
          setCanStart(true);
          setMessage("");
        }
      } catch (err) {
        console.error(err);
        setMessage("Failed to check attempt status.");
      }
    }
    loadAttempt();
  }, [examId]);

  const handleStart = async () => {
    if (!canStart) {
      return;
    }
    try {
      // server should create/resume attempt and return attempt info
      const res = await api.post(`/exams/${examId}/start`);
      // if backend says attempt already expired, show message
      if (res.data?.error) {
        setMessage(res.data.error);
        setCanStart(false);
        return;
      }
      // redirect / load questions using returned attempt id
      const attemptId = res.data.attempt?.id;
      // navigate to the question-taking UI (example)
      window.location.href = `/student/exam/${examId}/attempt/${attemptId}`;
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to start exam";
      setMessage(errMsg);
    }
  };

  return (
    <>
      {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
      <Button variant="contained" onClick={handleStart} disabled={!canStart}>
        {attempt && !attempt.submitted_at ? "Resume Exam" : "Start Exam"}
      </Button>
      {/* ...existing UI... */}
    </>
  );
}

export default StudentExamQuestionPage;