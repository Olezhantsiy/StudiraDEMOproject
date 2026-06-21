import { useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Divider,
  Chip,
  Grid,
  TextField,
  Button,
  Alert,
  Skeleton,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Edit, Save, Close, CalendarToday, Login } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { RoleLabels } from "../types";
import { api } from "../api/axios";
import type { User } from "../types";

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  STD: { bg: "#E3FCEF", color: "#006644" },
  SPV: { bg: "#DEEBFF", color: "#0747A6" },
  HOD: { bg: "#FFF0B3", color: "#FF8B00" },
  ADM: { bg: "#FFEBE6", color: "#BF2600" },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface EditForm {
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
}

export default function ProfilePage() {
  usePageTitle("Профиль");
  const { user, refetchUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<EditForm>({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    middle_name: user?.middle_name ?? "",
    email: user?.email ?? "",
  });

  const handleEdit = () => {
    setForm({
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      middle_name: user?.middle_name ?? "",
      email: user?.email ?? "",
    });
    setEditing(true);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setErrorMsg(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.patch<User>("/users/me/", form);
      await refetchUser();
      setEditing(false);
      setSuccessMsg("Данные успешно обновлены");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg("Не удалось сохранить изменения. Попробуйте снова.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  const roleStyle = ROLE_COLORS[user.role] ?? { bg: "#F4F5F7", color: "#42526E" };

  const initials =
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() ||
    user.username[0].toUpperCase();

  const fullName =
    [user.last_name, user.first_name, user.middle_name]
      .filter(Boolean)
      .join(" ") || user.username;

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      {/* Header */}
      <Typography variant="h5" fontWeight={700} color="#172B4D" mb={3}>
        Личный кабинет
      </Typography>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {/* Profile card */}
      <Card
        elevation={0}
        sx={{ border: "1px solid #DFE1E6", borderRadius: 2, mb: 3 }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
            {/* Avatar */}
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: "#0052CC",
                fontSize: 26,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </Avatar>

            {/* Info */}
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="h6" fontWeight={700} color="#172B4D">
                  {fullName}
                </Typography>
                <Chip
                  label={RoleLabels[user.role]}
                  size="small"
                  sx={{
                    bgcolor: roleStyle.bg,
                    color: roleStyle.color,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                @{user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>

            {/* Edit button */}
            {!editing && (
              <Tooltip title="Редактировать">
                <IconButton onClick={handleEdit} size="small">
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Edit form */}
      {editing && (
        <Card
          elevation={0}
          sx={{ border: "1px solid #0052CC", borderRadius: 2, mb: 3 }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2} color="#172B4D">
              Редактирование данных
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Фамилия"
                  fullWidth
                  size="small"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, last_name: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Имя"
                  fullWidth
                  size="small"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, first_name: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Отчество"
                  fullWidth
                  size="small"
                  value={form.middle_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, middle_name: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Email"
                  fullWidth
                  size="small"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  bgcolor: "#0052CC",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": { bgcolor: "#0747A6" },
                }}
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Close />}
                onClick={handleCancel}
                disabled={saving}
                sx={{
                  textTransform: "none",
                  borderColor: "#DFE1E6",
                  color: "#42526E",
                  "&:hover": { borderColor: "#B3BAC5" },
                }}
              >
                Отмена
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Details card */}
      <Card
        elevation={0}
        sx={{ border: "1px solid #DFE1E6", borderRadius: 2 }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2} color="#172B4D">
            Информация об аккаунте
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <InfoRow label="Имя пользователя" value={`@${user.username}`} />
            <Divider sx={{ my: 1.5 }} />
            <InfoRow label="Email" value={user.email || "—"} />
            <Divider sx={{ my: 1.5 }} />
            <InfoRow
              label="Роль"
              value={
                <Chip
                  label={RoleLabels[user.role]}
                  size="small"
                  sx={{
                    bgcolor: roleStyle.bg,
                    color: roleStyle.color,
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                />
              }
            />
            <Divider sx={{ my: 1.5 }} />
            <InfoRow
              label="Дата регистрации"
              icon={<CalendarToday sx={{ fontSize: 14, color: "text.secondary" }} />}
              value={formatDate(user.date_joined)}
            />
            <Divider sx={{ my: 1.5 }} />
            <InfoRow
              label="Последний вход"
              icon={<Login sx={{ fontSize: 14, color: "text.secondary" }} />}
              value={formatDate(user.last_login)}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {icon}
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
      </Box>
      <Typography variant="body2" color="#172B4D" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
}
