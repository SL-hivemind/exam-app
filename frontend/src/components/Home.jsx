import React from "react";
import { Box, Typography, Button, Stack, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <Paper elevation={0} sx={{ p: { xs: 3, md: 6 }, textAlign: "center", borderRadius: 3 }}>
      <Typography variant="h3" fontWeight={700} gutterBottom>
        Welcome to the Online Exam System
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700, mx: "auto", mb: 3 }}>
        Practice and take exams with ease. Students can view available exams and results.
        Admins can manage schools, students, and exams.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
        <Button size="large" variant="contained" onClick={() => navigate("/login")}>
          Login
        </Button>
        <Button size="large" variant="outlined" onClick={() => navigate("/register")}>
          Register as Student
        </Button>
      </Stack>
    </Paper>
  );
}
