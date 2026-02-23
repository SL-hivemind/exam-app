import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import useAuth from "../hooks/useAuth";

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

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile_number: "",
    class_number: "",
  });

  const isStudent = profile?.role === "student";
  const basePath = useMemo(() => getBasePath(profile?.role || user?.role), [profile?.role, user?.role]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/me/profile", {
          headers: { auth_token: authToken },
        });
        const data = res.data?.profile;
        setProfile(data);
        setForm({
          name: data?.name || "",
          email: data?.email || "",
          mobile_number: data?.mobile_number || "",
          class_number: data?.class_number || "",
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

  const onChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const onSave = async () => {
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const payload = isStudent
        ? {
            name: form.name,
          }
        : {
            name: form.name,
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
        name: nextProfile?.name || "",
        email: nextProfile?.email || "",
        mobile_number: nextProfile?.mobile_number || "",
        class_number: nextProfile?.class_number || "",
      });
      login({ ...(user || {}), ...nextProfile }, authToken);
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "70vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            My Profile
          </Typography>
          <Button variant="outlined" onClick={() => navigate(basePath)}>
            Back to Dashboard
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Username" value={profile?.username || ""} disabled />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Role" value={profile?.role || ""} disabled />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="School" value={profile?.school_name || "N/A"} disabled />
          </Grid>
          {isStudent && (
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Student ID" value={profile?.student_id || "N/A"} disabled />
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField fullWidth label="Name" value={form.name} onChange={onChange("name")} />
          </Grid>

          {isStudent ? (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Class"
                value={form.class_number}
                disabled
                helperText="Class can only be changed by school admin."
              />
            </Grid>
          ) : (
            <>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Email" value={form.email} onChange={onChange("email")} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Mobile Number" value={form.mobile_number} onChange={onChange("mobile_number")} />
              </Grid>
            </>
          )}
        </Grid>

        <Paper variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Security
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile?.security?.password_reset_channel || "Password reset policy is role-based."}
          </Typography>
        </Paper>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button variant="contained" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
