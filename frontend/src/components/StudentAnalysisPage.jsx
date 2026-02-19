import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend
} from "recharts";
import api from "../utils/api";
import useAuth from "../hooks/useAuth";

export default function StudentAnalysisPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!user?.id) return;
      try {
        const res = await api.get(`/student/analysis/${user.id}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load analysis");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [user?.id]);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  const { summary, timeline, chapter_breakdown, exam_wise, improvement_needed, strengths } = data;

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f7fa", minHeight: "100vh" }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/student")}>
          Back
        </Button>
        <Typography variant="h5" fontWeight={700}>Performance Analysis</Typography>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}><Chip label={`Exams: ${summary?.attempted_exams || 0}`} color="primary" /></Grid>
        <Grid item xs={12} md={3}><Chip label={`Avg %: ${summary?.average_percentage || 0}`} variant="outlined" /></Grid>
        <Grid item xs={12} md={3}><Chip label={`Avg Percentile: ${summary?.average_percentile || 0}`} variant="outlined" /></Grid>
        <Grid item xs={12} md={3}><Chip label={`Trend: ${summary?.trend || "steady"} (${summary?.trend_delta || 0})`} variant="outlined" /></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 360 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Score Trend</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={timeline || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: 360 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Chapter Accuracy</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={(chapter_breakdown || []).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="chapter" hide />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="percentage" fill="#2e7d32" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Improvement Needed</Typography>
            {(improvement_needed || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">No weak chapters detected.</Typography>
            ) : (
              <Stack spacing={1}>
                {improvement_needed.map((item) => (
                  <Chip key={item.chapter} label={`${item.chapter}: ${item.percentage}%`} color="warning" variant="outlined" />
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Strengths</Typography>
            {(strengths || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">No strong chapters yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {strengths.map((item) => (
                  <Chip key={item.chapter} label={`${item.chapter}: ${item.percentage}%`} color="success" variant="outlined" />
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Exam-wise Performance</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Exam</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Percent</TableCell>
                  <TableCell>Percentile</TableCell>
                  <TableCell>Rank</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(exam_wise || []).map((e) => (
                  <TableRow key={e.exam_id + String(e.submitted_time)}>
                    <TableCell>{e.exam_title}</TableCell>
                    <TableCell>{e.submitted_time ? new Date(e.submitted_time).toLocaleString() : "-"}</TableCell>
                    <TableCell>{`${e.score ?? 0}/${e.total_marks ?? 0}`}</TableCell>
                    <TableCell>{e.percentage ?? 0}%</TableCell>
                    <TableCell>{e.percentile ?? 0}</TableCell>
                    <TableCell>{e.rank && e.participants ? `${e.rank}/${e.participants}` : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
