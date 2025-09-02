import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  IconButton,
  InputAdornment,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";

export default function RegisterStudent() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    password: "",
    email: "",
    mobile_number: "",
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

  React.useEffect(() => {
    // Fetch schools for dropdown
    api
      .get("/schools")
      .then((res) => {
        setSchools(res.data.schools || []);
      })
      .catch(() => {
        setSchools([]);
      });
  }, []);

  // Validation functions
  const validateEmail = (email) => {
    if (!email) return ""; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? "" : "Please enter a valid email address";
  };

  const validatePassword = (password) => {
    if (!password) return "Password is required";

    const errors = [];
    if (password.length < 8) errors.push("at least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
    if (!/\d/.test(password)) errors.push("one number");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push("one special character");

    return errors.length > 0 ? `Password must contain ${errors.join(', ')}` : "";
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) return ""; // Optional field
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10 || cleaned.length > 15) {
      return "Phone number must be 10-15 digits";
    }
    return "";
  };

  const validateName = (name) => {
    if (!name || !name.trim()) return "Name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (name.trim().length > 100) return "Name must be less than 100 characters";
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(name.trim())) {
      return "Name can only contain letters, spaces, hyphens, and apostrophes";
    }
    return "";
  };

  const validateRollNumber = (number) => {
    if (!number) return "Roll number is required";
    const num = parseInt(number);
    if (isNaN(num) || num < 1 || num > 999) {
      return "Roll number must be between 1 and 999";
    }
    return "";
  };

  const validateClassNumber = (classNumber) => {
    if (!classNumber) return ""; // Optional field
    const num = parseInt(classNumber);
    if (isNaN(num) || num < 1 || num > 12) {
      return "Class number must be between 1 and 12";
    }
    return "";
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Real-time validation
    let errorMsg = "";
    switch (field) {
      case 'name':
        errorMsg = validateName(value);
        break;
      case 'password':
        errorMsg = validatePassword(value);
        break;
      case 'email':
        errorMsg = validateEmail(value);
        break;
      case 'mobile_number':
        errorMsg = validatePhoneNumber(value);
        break;
      case 'number':
        errorMsg = validateRollNumber(value);
        break;
      case 'class_number':
        errorMsg = validateClassNumber(value);
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    newErrors.name = validateName(form.name);
    newErrors.password = validatePassword(form.password);
    newErrors.school_id = !form.school_id ? "School selection is required" : "";
    newErrors.number = validateRollNumber(form.number);

    // Optional field validations
    newErrors.email = validateEmail(form.email);
    newErrors.mobile_number = validatePhoneNumber(form.mobile_number);
    newErrors.class_number = validateClassNumber(form.class_number);

    setErrors(newErrors);

    // Check if any errors exist
    return Object.values(newErrors).every(error => !error);
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!validateForm()) {
      setError("Please fix the validation errors before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare data for API
      const data = {
        name: form.name.trim(),
        password: form.password,
        email: form.email.trim() || null,
        mobile_number: form.mobile_number.trim() || null,
        school_id: form.school_id,
        class_number: form.class_number.trim() || null,
        number: form.number,
      };

      // Call API to register student
      await api.post("/admin/students", data);
      setSuccess("Student registered successfully");

      // Reset form
      setForm({
        name: "",
        password: "",
        email: "",
        mobile_number: "",
        school_id: "",
        class_number: "",
        number: "",
      });
      setErrors({});

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.detail || "Registration failed";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Register as Student
        </Typography>
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
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{ mr: 2 }}
              >
                ← Back to Login
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Name"
              required
              fullWidth
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              fullWidth
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Email"
              fullWidth
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Mobile Number"
              fullWidth
              value={form.mobile_number}
              onChange={(e) => handleChange("mobile_number", e.target.value)}
              error={!!errors.mobile_number}
              helperText={errors.mobile_number}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="School"
              required
              SelectProps={{ native: true }}
              fullWidth
              value={form.school_id}
              onChange={(e) => handleChange("school_id", e.target.value)}
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
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              label="Class"
              fullWidth
              value={form.class_number}
              onChange={(e) => handleChange("class_number", e.target.value)}
              error={!!errors.class_number}
              helperText={errors.class_number}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              label="Roll Number"
              required
              fullWidth
              value={form.number}
              onChange={(e) => handleChange("number", e.target.value)}
              error={!!errors.number}
              helperText={errors.number}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? "Registering..." : "Register"}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
