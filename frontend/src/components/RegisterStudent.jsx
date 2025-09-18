// src/components/RegisterStudent.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  Stack,
  Link as MuiLink,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import api from "../utils/api";

export default function RegisterStudent() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    password: "",
    email: "",
    school_id: "",
    class_number: "",
    number: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [schools, setSchools] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get("/schools")
      .then((res) => setSchools(res.data.schools || []))
      .catch(() => setSchools([]));
  }, []);

  // --- Validation functions (no changes needed here) ---
  const validateName = (name) => {
    if (!name || !name.trim()) return "Name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    return "";
  };
  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    return "";
  };
  // ... other validation functions can be added if needed

  // CORRECTED handleChange function
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Perform validation on submit
    const newErrors = {
      name: validateName(form.name),
      password: validatePassword(form.password),
      school_id: !form.school_id ? "School selection is required" : "",
      number: form.number ? "" : "Roll number is required",
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some(msg => msg !== "")) {
      setError("Please fix the errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSchool = schools.find(s => s.id === parseInt(form.school_id));
      if (!selectedSchool) {
        setError("Invalid school selected.");
        setIsSubmitting(false);
        return;
      }
      const data = {
        username: `${selectedSchool.code}-${form.class_number || 'X'}-${form.number}`,
        password: form.password,
        name: form.name.trim(),
        school_code: selectedSchool.code,
        class_number: form.class_number.trim() || null,
        number: form.number,
        email: form.email.trim() || null,
      };
      await api.post("/register", data);
      setSuccess("Registration successful! Your username is: " + data.username + ". You will be redirected to login.");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 140px)',
        width: '100%',
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        py: 4,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Paper
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: '500px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">
            Create Student Account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <Stack spacing={2.5}>
            <TextField
              name="name"
              label="Full Name"
              required
              fullWidth
              value={form.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
            />
            <TextField
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              fullWidth
              value={form.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              name="email"
              label="Email Address (Optional)"
              fullWidth
              value={form.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
            />
            <TextField
              name="school_id"
              select
              label="School"
              required
              SelectProps={{ native: true }}
              fullWidth
              value={form.school_id}
              onChange={handleChange}
              error={!!errors.school_id}
              helperText={errors.school_id}
            >
              <option value="">Select School</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                name="class_number"
                label="Class (Optional)"
                fullWidth
                value={form.class_number}
                onChange={handleChange}
              />
              <TextField
                name="number"
                label="Roll Number"
                required
                fullWidth
                value={form.number}
                onChange={handleChange}
                error={!!errors.number}
                helperText={errors.number}
              />
            </Stack>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              sx={{ mt: 1 }}
            >
              {isSubmitting ? "Registering..." : "Register"}
            </Button>
          </Stack>
        </Paper>

        <Typography variant="body2" sx={{ color: 'black', }}>
          Already have an account?{' '}
          <MuiLink component={RouterLink} to="/login" sx={{ color: 'black', fontWeight: 'bold' }}>
            Login here
          </MuiLink>
        </Typography>
      </Stack>
    </Box>
  );
}