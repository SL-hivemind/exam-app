import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  Button, Chip, Stack, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, InputAdornment, CircularProgress,
  ToggleButtonGroup, ToggleButton, Card, CardContent, useMediaQuery, useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";
import { PageHeader } from "../common";

export default function StudentRequests() {
  const { authToken } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  // Approve dialog
  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newClass, setNewClass] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/student-requests?status=${statusFilter}`, {
        headers: { auth_token: authToken },
      });
      setRequests(res.data?.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  }, [authToken, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openApprove = (req) => {
    setSelectedReq(req);
    setNewPassword("");
    setNewUsername("");
    setNewClass("");
    setApproveOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedReq) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {};
      if (selectedReq.type === "password_reset") {
        if (!newPassword || newPassword.length < 4) {
          setError("Password must be at least 4 characters");
          setSubmitting(false);
          return;
        }
        payload.new_password = newPassword;
      }
      if (selectedReq.type === "profile_update") {
        if (newUsername) payload.username = newUsername;
        if (newClass) payload.class_number = newClass;
      }

      await api.post(`/admin/student-requests/${selectedReq.id}/approve`, payload, {
        headers: { auth_token: authToken },
      });
      setSuccess("Request approved successfully");
      setApproveOpen(false);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (reqId) => {
    if (!window.confirm("Reject this request?")) return;
    try {
      await api.post(`/admin/student-requests/${reqId}/reject`, {}, {
        headers: { auth_token: authToken },
      });
      setSuccess("Request rejected");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject");
    }
  };

  return (
    <Box>
      <PageHeader
        icon={<NotificationsActiveIcon />}
        title="Student Requests"
        subtitle="Review and manage student password reset and profile update requests."
        actions={
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={(e, v) => v && setStatusFilter(v)}
            size="small"
          >
            <ToggleButton value="pending">Pending</ToggleButton>
            <ToggleButton value="approved">Approved</ToggleButton>
            <ToggleButton value="rejected">Rejected</ToggleButton>
          </ToggleButtonGroup>
        }
      />

      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>{success}</Alert>}

      {isMobile ? (
        /* ── MOBILE CARD LAYOUT ── */
        <Box>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : requests.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography color="text.secondary">No {statusFilter} requests found.</Typography>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {requests.map((r) => (
                <Card key={r.id} sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    {/* Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#cfe0ff' }}>
                          {r.student_name}
                        </Typography>
                        {r.student_id && (
                          <Chip label={r.student_id} size="small" sx={{ mt: 0.5, bgcolor: 'rgba(99,102,241,0.20)', color: '#c7d2fe' }} />
                        )}
                      </Box>
                      <Chip
                        label={r.status}
                        size="small"
                        color={r.status === "approved" ? "success" : r.status === "rejected" ? "error" : "warning"}
                      />
                    </Stack>
                    {/* Type + Message */}
                    <Stack spacing={1} mb={1.5}>
                      <Chip
                        label={r.type === "password_reset" ? "Password Reset" : "Profile Update"}
                        size="small"
                        color={r.type === "password_reset" ? "warning" : "info"}
                        variant="outlined"
                        sx={{ alignSelf: 'flex-start' }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {r.message || "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                      </Typography>
                    </Stack>
                    {/* Actions */}
                    {statusFilter === "pending" && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small" variant="contained" color="success" fullWidth
                          startIcon={<CheckCircleIcon />}
                          onClick={() => openApprove(r)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small" variant="outlined" color="error" fullWidth
                          startIcon={<CancelIcon />}
                          onClick={() => handleReject(r.id)}
                        >
                          Reject
                        </Button>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      ) : (
        /* ── DESKTOP TABLE LAYOUT ── */
        <Paper elevation={1} sx={{ borderRadius: 2, overflowX: "auto" }}>
          <Table>
            <TableHead sx={{ bgcolor: "transparent" }}>
              <TableRow>
                <TableCell><strong>Student</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Message</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                {statusFilter === "pending" && (
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No {statusFilter} requests found.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {r.student_name}
                      </Typography>
                      {r.student_id && (
                        <Chip label={r.student_id} size="small" sx={{ mt: 0.5, bgcolor: "rgba(99,102,241,0.20)", color: "#c7d2fe" }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.type === "password_reset" ? "Password Reset" : "Profile Update"}
                        size="small"
                        color={r.type === "password_reset" ? "warning" : "info"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {r.message || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.status}
                        size="small"
                        color={
                          r.status === "approved" ? "success" :
                          r.status === "rejected" ? "error" : "warning"
                        }
                      />
                    </TableCell>
                    {statusFilter === "pending" && (
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => openApprove(r)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => handleReject(r.id)}
                          >
                            Reject
                          </Button>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Approve {selectedReq?.type === "password_reset" ? "Password Reset" : "Profile Update"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Student: <strong>{selectedReq?.student_name}</strong>
            {selectedReq?.student_id && ` (${selectedReq.student_id})`}
          </Typography>
          {selectedReq?.message && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Student's message: "{selectedReq.message}"
            </Alert>
          )}

          {selectedReq?.type === "password_reset" && (
            <TextField
              fullWidth
              label="Set New Password"
              type={showPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="This will be the student's new login password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small">
                      {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}

          {selectedReq?.type === "profile_update" && (
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="New Username (optional)"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <TextField
                fullWidth
                label="New Class Number (optional)"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApproveOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={submitting}>
            {submitting ? "Approving..." : "Approve & Apply"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
