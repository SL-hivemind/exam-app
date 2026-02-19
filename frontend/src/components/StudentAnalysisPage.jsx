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
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  Insights as InsightsIcon,
  School as SchoolIcon
} from "@mui/icons-material";
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
  const chapterChartData = (chapter_breakdown || []).slice(0, 12);
  const trendPositive = (summary?.trend_delta || 0) >= 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#eef2f8", minHeight: "100vh" }}>
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          borderRadius: 3,
          color: "#fff",
          background: "linear-gradient(120deg, #1f3b73 0%, #1f6ed4 50%, #3f9cff 100%)"
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Performance Dashboard</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Track trend, percentile, strengths, and improvement areas.
            </Typography>
          </Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/student")}
            variant="contained"
            sx={{ bgcolor: "#fff", color: "#1f3b73", "&:hover": { bgcolor: "#f2f6ff" } }}
          >
            Back to Exams
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2.5} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">Exams Attempted</Typography>
              <SchoolIcon color="primary" fontSize="small" />
            </Stack>
            <Typography variant="h4" fontWeight={800}>{summary?.attempted_exams || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">Average Score</Typography>
              <TrendingUpIcon sx={{ color: "#2e7d32" }} fontSize="small" />
            </Stack>
            <Typography variant="h4" fontWeight={800}>{summary?.average_percentage || 0}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">Avg Percentile</Typography>
              <InsightsIcon sx={{ color: "#ed6c02" }} fontSize="small" />
            </Stack>
            <Typography variant="h4" fontWeight={800}>{summary?.average_percentile || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">Trend</Typography>
              <Chip
                size="small"
                label={summary?.trend || "steady"}
                color={trendPositive ? "success" : "error"}
                variant="outlined"
              />
            </Stack>
            <Typography variant="h4" fontWeight={800}>
              {trendPositive ? "+" : ""}{summary?.trend_delta || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, height: { xs: 360, md: 430 } }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Score Trend</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Progress across submitted exams (percentage-wise).
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={timeline || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" minTickGap={24} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend verticalAlign="top" height={28} />
                <Line type="monotone" dataKey="percentage" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Improvement Needed</Typography>
            <Typography variant="caption" color="text.secondary">Lowest-scoring chapters</Typography>
            <Divider sx={{ my: 1.5 }} />
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

          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700}>Strength Zones</Typography>
            <Typography variant="caption" color="text.secondary">Top-performing chapters</Typography>
            <Divider sx={{ my: 1.5 }} />
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
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, height: { xs: 420, md: 520 } }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Chapter Accuracy</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Horizontal view for easier chapter-by-chapter comparison.
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                data={chapterChartData}
                layout="vertical"
                margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="chapter"
                  width={150}
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <Tooltip />
                <Bar dataKey="percentage" fill="#2e7d32" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Exam-wise Performance</Typography>
            <TableContainer>
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
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
