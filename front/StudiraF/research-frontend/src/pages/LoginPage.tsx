import { useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useNavigate, Navigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import { login } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  usePageTitle("Вход");
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, setTokens, refetchUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const loginMut = useMutation({
    mutationFn: login,
    onSuccess: async (tokens) => {
      setTokens(tokens.access, tokens.refresh);
      await refetchUser();
      navigate("/", { replace: true });
    },
    onError: () => {
      setFormError("Неверный логин или пароль");
    },
  });

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    loginMut.mutate({ username: username.trim(), password });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 400,
          p: 3,
          border: "1px solid #DFE1E6",
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: 700, color: "#172B4D" }}
        >
          Вход
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Используйте учётную запись системы
        </Typography>

        {formError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
            {formError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Логин"
            name="username"
            autoComplete="username"
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loginMut.isPending}
          />
          <TextField
            label="Пароль"
            name="password"
            type="password"
            autoComplete="current-password"
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loginMut.isPending}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={!username.trim() || !password || loginMut.isPending}
            sx={{
              textTransform: "none",
              py: 1,
              bgcolor: "#0052CC",
              "&:hover": { bgcolor: "#0747A6" },
            }}
          >
            {loginMut.isPending ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "Войти"
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
