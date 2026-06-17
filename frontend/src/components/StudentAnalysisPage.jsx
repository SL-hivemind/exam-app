import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Toolbar,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  useTheme,
  useMediaQuery
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
  PieChart,
  Pie,
  Cell,
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
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [lastX, setLastX] = useState("5");

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

  const { chapter_breakdown, subject_breakdown, exam_wise, improvement_needed, strengths } = data;
  const allExamWise = exam_wise || [];
  const filteredExamWise = lastX === "all" ? allExamWise : allExamWise.slice(-Number(lastX));
  const filteredTimeline = filteredExamWise.map((e) => ({
    label: e.submitted_time ? new Date(e.submitted_time).toLocaleDateString("en-US", { day: "2-digit", month: "short" }) : "-",
    percentage: e.percentage || 0,
    exam_title: e.exam_title
  }));
  const filteredAttempted = filteredExamWise.length;
  const filteredAvgPct = filteredAttempted
    ? Math.round(filteredExamWise.reduce((acc, e) => acc + (e.percentage || 0), 0) / filteredAttempted)
    : 0;
  const filteredValidPercentiles = filteredExamWise.filter((e) => e.percentile !== null && e.percentile !== undefined);
  const filteredAvgPercentile = filteredValidPercentiles.length
    ? Math.round(filteredValidPercentiles.reduce((acc, e) => acc + (e.percentile || 0), 0) / filteredValidPercentiles.length)
    : 0;
  const filteredTrendDelta = filteredAttempted >= 2
    ? Math.round((filteredExamWise[filteredAttempted - 1].percentage || 0) - (filteredExamWise[filteredAttempted - 2].percentage || 0))
    : 0;
  const filteredTrendPositive = filteredTrendDelta >= 0;
  const pieEarned = filteredExamWise.reduce((acc, e) => acc + Number(e.score || 0), 0);
  const pieTotal = filteredExamWise.reduce((acc, e) => acc + Number(e.total_marks || 0), 0);
  const pieRemaining = Math.max(pieTotal - pieEarned, 0);
  const marksPieData = [
    { name: "Earned", value: pieEarned, color: "#2e7d32" },
    { name: "Remaining", value: pieRemaining, color: "#d32f2f" }
  ];
  const chapterChartData = (chapter_breakdown || []).slice(0, 12);
  const subjectChartData = (subject_breakdown || []).slice(0, 10);
  const trendPositive = filteredTrendPositive;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: "#eef2f8", minHeight: "100vh" }}>
      <Toolbar />
      <Container maxWidth="xl" sx={{ px: { xs: 0.5, md: 2 } }}>
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          borderRadius: 3,
          color: "#fff",
          background: "linear-gradient(120deg, #1e3a8a 0%, #2563eb 50%, #60a5fa 100%)"
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Performance Dashboard</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Track trend, percentile, strengths, and improvement areas.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
            <FormControl size="small" sx={{ minWidth: 160, bgcolor: "rgba(255,255,255,0.05)", borderRadius: 1 }}>
              <InputLabel id="last-x-label">Window</InputLabel>
              <Select
                labelId="last-x-label"
                label="Window"
                value={lastX}
                onChange={(e) => setLastX(e.target.value)}
              >
                <MenuItem value="3">Last 3 Exams</MenuItem>
                <MenuItem value="5">Last 5 Exams</MenuItem>
                <MenuItem value="10">Last 10 Exams</MenuItem>
                <MenuItem value="all">All Exams</MenuItem>
              </Select>
            </FormControl>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/student")}
              variant="contained"
              sx={{ bgcolor: "rgba(255,255,255,0.05)", color: "#1e3a8a", "&:hover": { bgcolor: "#f2f6ff" } }}
            >
              Back to Exams
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2.5} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 8px 24px rgba(16,24,40,0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">Exams Attempted</Typography>
              <SchoolIcon color="primary" fontSize="small" />
            </Stack>
            <Typography variant="h4" fontWeight={800}>{filteredAttempted}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 8px 24px rgba(16,24,40,0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">Average Score</Typography>
              <TrendingUpIcon sx={{ color: "#2e7d32" }} fontSize="small" />
            </Stack>
            <Typography variant="h4" fontWeight={800}>{filteredAvgPct}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 8px 24px rgba(16,24,40,0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">Avg Percentile</Typography>
              <InsightsIcon sx={{ color: "#ed6c02" }} fontSize="small" />
            </Stack>
            <Typography variant="h4" fontWeight={800}>{filteredAvgPercentile}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 8px 24px rgba(16,24,40,0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">Trend</Typography>
              <Chip
                size="small"
                label={filteredAttempted < 2 ? "steady" : trendPositive ? "improving" : "declining"}
                color={trendPositive ? "success" : "error"}
                variant="outlined"
              />
            </Stack>
            <Typography variant="h4" fontWeight={800}>
              {trendPositive ? "+" : ""}{filteredTrendDelta}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 10px 28px rgba(16,24,40,0.06)', height: { xs: 360, md: 430 } }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Score Trend</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Progress across selected exam window.
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={filteredTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" minTickGap={isMdDown ? 12 : 24} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                {!isMdDown && <Legend verticalAlign="top" height={28} />}
                <Line type="monotone" dataKey="percentage" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 10px 28px rgba(16,24,40,0.06)', height: { xs: 320, md: 430 } }}>
            <Typography variant="subtitle1" fontWeight={700}>Marks Distribution</Typography>
            <Typography variant="caption" color="text.secondary">For selected exam window</Typography>
            <ResponsiveContainer width="100%" height="88%">
              <PieChart>
                <Pie data={marksPieData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {marksPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                {!isMdDown && <Legend />}
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 8px 24px rgba(16,24,40,0.05)', height: '100%' }}>
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
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 8px 24px rgba(16,24,40,0.05)', height: '100%' }}>
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

        <Grid item xs={12} lg={subjectChartData.length > 0 ? 7 : 12}>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 10px 28px rgba(16,24,40,0.06)', height: { xs: 420, md: 520 } }}>
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
                  width={isMdDown ? 100 : 150}
                  tick={{ fontSize: isMdDown ? 10 : 12 }}
                  interval={0}
                />
                <Tooltip />
                <Bar dataKey="percentage" fill="#2e7d32" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {subjectChartData.length > 0 && (
          <Grid item xs={12} lg={5}>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 10px 28px rgba(16,24,40,0.06)', height: { xs: 360, md: 520 } }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Subject Accuracy</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Subject-wise earned marks percentage.
              </Typography>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={subjectChartData} margin={{ top: 6, right: 20, left: 10, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" minTickGap={isMdDown ? 10 : 24} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  {!isMdDown && <Legend />}
                  <Bar dataKey="percentage" fill="#2563eb" name="Score %" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #d9e2f1", boxShadow: '0 10px 28px rgba(16,24,40,0.06)' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Exam-wise Performance</Typography>
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size={isMdDown ? "small" : "medium"} stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ position: 'sticky', top: 0, bgcolor: '#f7f9fc', zIndex: 1 }}>Exam</TableCell>
                    <TableCell sx={{ position: 'sticky', top: 0, bgcolor: '#f7f9fc', zIndex: 1 }}>Submitted</TableCell>
                    <TableCell sx={{ position: 'sticky', top: 0, bgcolor: '#f7f9fc', zIndex: 1 }}>Score</TableCell>
                    <TableCell sx={{ position: 'sticky', top: 0, bgcolor: '#f7f9fc', zIndex: 1 }}>Percent</TableCell>
                    <TableCell sx={{ position: 'sticky', top: 0, bgcolor: '#f7f9fc', zIndex: 1 }}>Percentile</TableCell>
                    <TableCell sx={{ position: 'sticky', top: 0, bgcolor: '#f7f9fc', zIndex: 1 }}>Rank</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredExamWise.map((e) => (
                    <TableRow
                      key={e.exam_id + String(e.submitted_time)}
                      hover
                      sx={{ '&:nth-of-type(even)': { bgcolor: '#fafbff' } }}
                    >
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
      </Container>
    </Box>
  );
}
