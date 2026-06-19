import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  Chip,
  Divider,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockResetIcon from "@mui/icons-material/LockReset";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import CancelIcon from "@mui/icons-material/Cancel";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import useAuth from "../hooks/useAuth";
import DynamicIDBadge from "./ui/DynamicIDBadge";

function getBasePath(role) {
  if (role === "admin") return "/admin";
  if (role === "school_admin") return "/school";
  if (role === "subject_specialist") return "/specialist";
  return "/student";
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { authToken, user, login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState(null);

  // OTP password flow
  const [otpStep, setOtpStep] = useState(0); // 0=idle, 1=otp sent, 2=ready
  const [otpSending, setOtpSending] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Student request
  const [requestMsg, setRequestMsg] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");
  const [myRequests, setMyRequests] = useState([]);

  const [form, setForm] = useState({
    username: "",
    email: "",
    mobile_number: "",
  });

  const isStudent = profile?.role === "student";
  const basePath = useMemo(
    () => getBasePath(profile?.role || user?.role),
    [profile?.role, user?.role]
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/me/profile", {
          headers: { auth_token: authToken },
        });
        const data = res.data?.profile;
        setProfile(data);
        setForm({
          username: data?.username || "",
          email: data?.email || "",
          mobile_number: data?.mobile_number || "",
        });
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authToken]);

  // Fetch student requests
  useEffect(() => {
    if (!isStudent) return;
    api
      .get("/me/request-status", { headers: { auth_token: authToken } })
      .then((res) => setMyRequests(res.data?.requests || []))
      .catch(() => {});
  }, [isStudent, authToken, requestSuccess]);

  const onChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const onSave = async () => {
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const payload = {
        username: form.username,
        email: form.email,
        mobile_number: form.mobile_number,
      };

      await api.put("/me/profile", payload, {
        headers: { auth_token: authToken },
      });

      const refreshed = await api.get("/me/profile", {
        headers: { auth_token: authToken },
      });
      const nextProfile = refreshed.data?.profile;
      setProfile(nextProfile);
      setForm({
        username: nextProfile?.username || "",
        email: nextProfile?.email || "",
        mobile_number: nextProfile?.mobile_number || "",
      });
      login({ ...(user || {}), ...nextProfile }, authToken);
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // OTP flow
  const onRequestOtp = async () => {
    setPwError("");
    setPwSuccess("");
    setOtpSending(true);
    try {
      const res = await api.post(
        "/me/request-otp",
        {},
        { headers: { auth_token: authToken } }
      );
      setPwSuccess(res.data?.message || "OTP sent to your email!");
      setOtpStep(1);
    } catch (err) {
      setPwError(
        err.response?.data?.message || "Failed to send OTP. Check your email."
      );
    } finally {
      setOtpSending(false);
    }
  };

  const onChangePassword = async () => {
    setPwError("");
    setPwSuccess("");
    if (!otp || !newPw || !confirmPw) {
      setPwError("All fields are required");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    try {
      setPwSaving(true);
      await api.post(
        "/me/change-password",
        { otp, new_password: newPw },
        { headers: { auth_token: authToken } }
      );
      setPwSuccess("Password updated successfully!");
      setOtp("");
      setNewPw("");
      setConfirmPw("");
      setOtpStep(0);
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to update password");
    } finally {
      setPwSaving(false);
    }
  };

  // Student request
  const onStudentRequest = async (type) => {
    setRequestError("");
    setRequestSuccess("");
    setRequesting(true);
    try {
      const res = await api.post(
        "/me/request-update",
        { request_type: type, message: requestMsg },
        { headers: { auth_token: authToken } }
      );
      setRequestSuccess(res.data?.message || "Request submitted!");
      setRequestMsg("");
    } catch (err) {
      setRequestError(
        err.response?.data?.message || "Failed to submit request"
      );
    } finally {
      setRequesting(false);
    }
  };

  const statusIcon = (status) => {
    if (status === "approved")
      return <CheckCircleIcon fontSize="small" color="success" />;
    if (status === "rejected")
      return <CancelIcon fontSize="small" color="error" />;
    return <PendingIcon fontSize="small" color="warning" />;
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {/* ─── Digital ID Badge (Floating outside all cards) ─── */}
      {!isStudent && profile && (
        <DynamicIDBadge profile={profile} />
      )}

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h5" fontWeight={700}>
            My Profile
          </Typography>
          <Button variant="outlined" onClick={() => navigate(basePath)}>
            Back to Dashboard
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* ─── Read-only fields ─── */}
        <Grid container spacing={2}>
          {isStudent && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Student ID"
                value={profile?.student_id || "N/A"}
                disabled
              />
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Role"
              value={profile?.role || ""}
              disabled
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="School"
              value={profile?.school_name || "N/A"}
              disabled
            />
          </Grid>
          {isStudent && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Class"
                value={profile?.class_number || "N/A"}
                disabled
                helperText="Request update from school admin to change."
              />
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* ─── Editable fields (Admin roles only) ─── */}
        {isStudent ? (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Account Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={profile?.username || ""}
                  disabled
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={profile?.email || "N/A"}
                  disabled
                />
              </Grid>
            </Grid>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5 }}
            >
              Students cannot edit their profile directly. Use the buttons below
              to request changes from your school admin.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Edit Profile
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={form.username}
                  onChange={onChange("username")}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={form.email}
                  onChange={onChange("email")}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Mobile Number"
                  value={form.mobile_number}
                  onChange={onChange("mobile_number")}
                />
              </Grid>
            </Grid>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button variant="contained" onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* ─── Security Section ─── */}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Security
          </Typography>

          {isStudent ? (
            /* ── Student: Request buttons ── */
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Need a password reset or profile update? Submit a request and
                your school admin will take care of it.
              </Typography>

              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Message to admin (optional)"
                placeholder="e.g. Please update my class to 10"
                value={requestMsg}
                onChange={(e) => setRequestMsg(e.target.value)}
                sx={{ mb: 2 }}
              />

              {requestError && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {requestError}
                </Alert>
              )}
              {requestSuccess && (
                <Alert severity="success" sx={{ mb: 1.5 }}>
                  {requestSuccess}
                </Alert>
              )}

              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<LockResetIcon />}
                  onClick={() => onStudentRequest("password_reset")}
                  disabled={requesting}
                >
                  Request Password Reset
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => onStudentRequest("profile_update")}
                  disabled={requesting}
                >
                  Request Profile Update
                </Button>
              </Stack>

              {/* Show existing requests */}
              {myRequests.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ mb: 1 }}
                  >
                    Your Recent Requests
                  </Typography>
                  <Stack spacing={1}>
                    {myRequests.map((r) => (
                      <Stack
                        key={r.id}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor:
                            r.status === "pending"
                              ? "#fff8e1"
                              : r.status === "approved"
                              ? "rgba(52,211,153,0.12)"
                              : "rgba(251,113,133,0.12)",
                        }}
                      >
                        {statusIcon(r.status)}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {r.type === "password_reset"
                              ? "Password Reset"
                              : "Profile Update"}
                          </Typography>
                          {r.message && (
                            <Typography variant="caption" color="text.secondary">
                              "{r.message}"
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={r.status}
                          size="small"
                          color={
                            r.status === "approved"
                              ? "success"
                              : r.status === "rejected"
                              ? "error"
                              : "warning"
                          }
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          ) : (
            /* ── Admin/School Admin/Specialist: OTP Password Reset ── */
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                To change your password, we'll send a one-time code to your
                registered email.
              </Typography>

              {pwError && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {pwError}
                </Alert>
              )}
              {pwSuccess && (
                <Alert severity="success" sx={{ mb: 1.5 }}>
                  {pwSuccess}
                </Alert>
              )}

              {otpStep === 0 && (
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={onRequestOtp}
                  disabled={otpSending}
                >
                  {otpSending ? "Sending OTP..." : "Send OTP to Email"}
                </Button>
              )}

              {otpStep >= 1 && (
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="OTP Code"
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      inputProps={{ maxLength: 6 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      type={showNewPw ? "text" : "password"}
                      fullWidth
                      label="New Password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowNewPw(!showNewPw)}
                              edge="end"
                              size="small"
                            >
                              {showNewPw ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      type={showConfirmPw ? "text" : "password"}
                      fullWidth
                      label="Confirm Password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPw(!showConfirmPw)}
                              edge="end"
                              size="small"
                            >
                              {showConfirmPw ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        onClick={onChangePassword}
                        disabled={pwSaving}
                      >
                        {pwSaving ? "Updating..." : "Change Password"}
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={onRequestOtp}
                        disabled={otpSending}
                      >
                        Resend OTP
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
        </Paper>
      </Paper>
    </Container>
    </>
  );
}
