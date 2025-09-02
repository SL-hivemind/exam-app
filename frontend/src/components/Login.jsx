import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import api from "../utils/api";
import useAuth from "../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const { control, handleSubmit } = useForm({
    defaultValues: { username: "", password: "" },
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      let redirectTo = location.state?.from?.pathname || "/";
      if (user.role === "student") {
        redirectTo = "/dashboard/student";
      } else if (user.role === "admin") {
        redirectTo = "/dashboard/admin";
      }
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const onSubmit = async (form) => {
    setError("");
    try {
      const { data } = await api.post("/login", form);
      if (!data.user || !data.auth_token) {
        throw new Error("Invalid response from server");
      }
      login(data.user, data.auth_token);
    } catch (e) {
      setError(e?.response?.data?.message || "Login failed. Check your credentials.");
    }
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="70vh">
      <Paper sx={{ p: 4, width: "100%", maxWidth: 420 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Sign in
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="username"
            control={control}
            rules={{ required: "Username is required" }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Username / Student ID"
                fullWidth
                margin="normal"
                autoComplete="username"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="password"
            control={control}
            rules={{ required: "Password is required" }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Password"
                type={showPw ? "text" : "password"}
                fullWidth
                margin="normal"
                autoComplete="current-password"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPw((s) => !s)} edge="end">
                        {showPw ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Login
          </Button>
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{" "}
              <Button
                variant="text"
                onClick={() => navigate("/register")}
                sx={{ p: 0, minWidth: "auto", textTransform: "none" }}
              >
                Register as Student
              </Button>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
