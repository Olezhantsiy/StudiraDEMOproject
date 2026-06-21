import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  Link,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack,
  Delete,
  Edit,
  OpenInNew,
  Article,
  MenuBook,
  MicNone,
} from "@mui/icons-material";
import {
  getPublications,
  updatePublication,
  deletePublication,
  getIndexingSystems,
  type PublicationPayload,
} from "../api/publications";
import { getProject } from "../api/projects";
import { useAuth } from "../contexts/AuthContext";
import {
  type Publication,
  type PublicationType,
  type PublicationStatus,
  type IndexingSystem,
  PublicationTypeLabels,
  PublicationTypeColors,
  PublicationStatusLabels,
  PublicationStatusColors,
} from "../types";

const TYPE_OPTIONS: { value: PublicationType; label: string }[] = [
  { value: "ARTICLE", label: "Статья" },
  { value: "THESIS", label: "Тезисы" },
  { value: "CONFERENCE", label: "Доклад" },
];

const STATUS_OPTIONS: { value: PublicationStatus; label: string }[] = [
  { value: "DRAFT", label: "Черновик" },
  { value: "PENDING", label: "На рассмотрении" },
  { value: "PRINT", label: "В печати" },
  { value: "PUBLISHED", label: "Опубликована" },
  { value: "REJECTED", label: "Отклонена" },
];

const TypeIcon = ({ type }: { type: PublicationType }) => {
  if (type === "ARTICLE") return <Article sx={{ fontSize: 18 }} />;
  if (type === "THESIS") return <MenuBook sx={{ fontSize: 18 }} />;
  return <MicNone sx={{ fontSize: 18 }} />;
};

function TypeChip({ type }: { type: PublicationType }) {
  const color = PublicationTypeColors[type];
  return (
    <Chip
      icon={<TypeIcon type={type} />}
      label={PublicationTypeLabels[type]}
      size="small"
      sx={{
        bgcolor: color.bg,
        color: color.color,
        fontWeight: 600,
        fontSize: 11,
        height: 24,
        "& .MuiChip-icon": { color: color.color, fontSize: 14, ml: 0.5 },
      }}
    />
  );
}

function StatusChip({ status }: { status: PublicationStatus }) {
  const c = PublicationStatusColors[status];
  return (
    <Chip
      label={PublicationStatusLabels[status]}
      size="small"
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 600, fontSize: 11, height: 22 }}
    />
  );
}

const emptyForm = (): PublicationPayload => ({
  title: "",
  url: "",
  doi: "",
  type: "ARTICLE",
  status: "DRAFT",
  year: new Date().getFullYear(),
});

export default function PublicationsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  // HOD can manage any project; SPV only their own; student only their own
  const canManage =
    user?.role === "HOD" ||
    (user?.role === "SPV" && project?.supervisor?.id === user?.id) ||
    (user?.role === "STD" && project?.enrollment?.student?.id === user?.id);

  // ── Data ──────────────────────────────────────────────────
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });

  usePageTitle(project ? `Публикации — ${project.title}` : "Публикации");

  const {
    data: publications = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["publications", projectId],
    queryFn: () => getPublications(projectId),
  });

  const { data: indexingSystems = [] } = useQuery<IndexingSystem[]>({
    queryKey: ["indexing-systems"],
    queryFn: getIndexingSystems,
  });

  // ── Dialog state ──────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Publication | null>(null);
  const [form, setForm] = useState<PublicationPayload>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Publication | null>(null);

  const openEdit = (pub: Publication) => {
    setEditing(pub);
    setForm({
      title: pub.title,
      url: pub.url,
      doi: pub.doi,
      type: pub.type,
      status: pub.status,
      year: pub.year,
      index_ids: pub.indexes.map((ix) => ix.id),
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  // ── Mutations ─────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: () => updatePublication(projectId, editing!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publications", projectId] });
      handleClose();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (pub: Publication) => deletePublication(projectId, pub.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publications", projectId] });
      setDeleteTarget(null);
    },
  });

  const canSave = form.title.trim() !== "" && form.type !== undefined;

  // ── Render ────────────────────────────────────────────────
  if (isError) {
    return (
      <Alert severity="error">
        Не удалось загрузить публикации. Проверьте подключение к серверу.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 860, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/projects/${projectId}`)}
          sx={{ textTransform: "none", color: "#42526E" }}
        >
          К проекту
        </Button>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} color="#172B4D">
            Публикации
          </Typography>
          {project && (
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ maxWidth: 520 }}
            >
              {project.title}
            </Typography>
          )}
        </Box>

      </Box>

      {/* Stats */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {(["ARTICLE", "THESIS", "CONFERENCE"] as PublicationType[]).map((t) => {
          const count = publications.filter((p) => p.type === t).length;
          const color = PublicationTypeColors[t];
          return (
            <Box
              key={t}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                border: "1px solid #DFE1E6",
                bgcolor: "white",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography variant="h6" fontWeight={700} sx={{ color: color.color }}>
                {count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {PublicationTypeLabels[t]}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* List */}
      {isLoading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} elevation={0} sx={{ border: "1px solid #DFE1E6" }}>
              <CardContent>
                <Skeleton width="60%" height={24} />
                <Skeleton width="40%" height={18} sx={{ mt: 0.5 }} />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : publications.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            border: "1px solid #DFE1E6",
            borderRadius: 2,
            py: 8,
            textAlign: "center",
          }}
        >
          <Article sx={{ fontSize: 48, color: "#DFE1E6", mb: 1 }} />
          <Typography variant="body1" color="text.secondary" fontWeight={500}>
            Публикаций пока нет
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Публикации создаются через задачи проекта
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {publications.map((pub) => (
            <Card
              key={pub.id}
              elevation={0}
              sx={{
                border: "1px solid #DFE1E6",
                borderRadius: 2,
                transition: "box-shadow 0.15s",
                "&:hover": { borderColor: "#B3D4FF" },
              }}
            >
              <CardContent
                sx={{
                  py: 2,
                  px: 2.5,
                  "&:last-child": { pb: 2 },
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                }}
              >
                {/* Left: info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* Type + status + year row */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.8, flexWrap: "wrap" }}>
                    <TypeChip type={pub.type} />
                    <StatusChip status={pub.status} />
                    {pub.year && (
                      <Typography variant="caption" sx={{ color: "#6B778C", fontWeight: 600 }}>
                        {pub.year}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                      {new Date(pub.created_at).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Typography>
                  </Box>

                  {/* Bibliographic description */}
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    color="#172B4D"
                    sx={{ mb: 0.5 }}
                  >
                    {pub.title}
                  </Typography>

                  <Link
                    href={pub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    sx={{
                      color: "#0052CC",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    <OpenInNew sx={{ fontSize: 14 }} />
                    {pub.url}
                  </Link>

                  {pub.doi && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      DOI: {pub.doi}
                    </Typography>
                  )}

                  {pub.indexes && pub.indexes.length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.8 }}>
                      {pub.indexes.map((ix) => (
                        <Chip
                          key={ix.id}
                          label={ix.name}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 10, fontWeight: 600, height: 20, color: "#403294", borderColor: "#EAE6FF", bgcolor: "#EAE6FF" }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Right: actions */}
                {canManage && (
                  <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                    <Tooltip title="Редактировать">
                      <IconButton size="small" onClick={() => openEdit(pub)}>
                        <Edit sx={{ fontSize: 16, color: "#5E6C84" }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <IconButton
                        size="small"
                        onClick={() => setDeleteTarget(pub)}
                      >
                        <Delete sx={{ fontSize: 16, color: "#BF2600" }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#172B4D", pb: 1 }}>
          {editing ? "Редактировать публикацию" : "Добавить публикацию"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Тип</InputLabel>
            <Select
              value={form.type}
              label="Тип"
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as PublicationType }))
              }
            >
              {TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Статус</InputLabel>
            <Select
              value={form.status}
              label="Статус"
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as PublicationStatus }))
              }
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Год публикации"
            size="small"
            fullWidth
            type="number"
            value={form.year ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                year: e.target.value ? parseInt(e.target.value) : null,
              }))
            }
            inputProps={{ min: 1900, max: 2100 }}
            placeholder={String(new Date().getFullYear())}
          />

          <TextField
            label="Библиографическое описание"
            size="small"
            fullWidth
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Автор А.А. Название работы // Журнал. — 2024. — №1. — С. 1–10."
            multiline
            rows={2}
          />

          <TextField
            label="Ссылка (URL)"
            size="small"
            fullWidth
            required
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://..."
          />

          <TextField
            label="DOI (необязательно)"
            size="small"
            fullWidth
            value={form.doi}
            onChange={(e) => setForm((f) => ({ ...f, doi: e.target.value }))}
            placeholder="10.xxxx/..."
          />

          {/* Indexing systems */}
          {indexingSystems.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ color: "#6B778C", fontWeight: 600, mb: 0.5, display: "block" }}>
                Индексирование
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {indexingSystems.map((sys) => {
                  const selected = (form.index_ids ?? []).includes(sys.id);
                  return (
                    <Chip
                      key={sys.id}
                      label={sys.name}
                      size="small"
                      clickable
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          index_ids: selected
                            ? (f.index_ids ?? []).filter((id) => id !== sys.id)
                            : [...(f.index_ids ?? []), sys.id],
                        }))
                      }
                      sx={{
                        fontWeight: 600,
                        bgcolor: selected ? "#0052CC" : "#F4F5F7",
                        color: selected ? "#fff" : "#42526E",
                        "&:hover": { bgcolor: selected ? "#0747A6" : "#DFE1E6" },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {saveMut.isError && (
            <Alert severity="error">
              Не удалось сохранить публикацию. Проверьте данные.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} sx={{ textTransform: "none" }}>
            Отмена
          </Button>
          <Button
            variant="contained"
            disabled={!canSave || saveMut.isPending}
            onClick={() => saveMut.mutate()}
            startIcon={
              saveMut.isPending ? (
                <CircularProgress size={14} color="inherit" />
              ) : undefined
            }
            sx={{
              textTransform: "none",
              bgcolor: "#0052CC",
              "&:hover": { bgcolor: "#0747A6" },
            }}
          >
            {saveMut.isPending ? "Сохранение..." : editing ? "Сохранить" : "Добавить"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#172B4D" }}>
          Удалить публикацию?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            «{deleteTarget?.title}» будет удалена безвозвратно.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            sx={{ textTransform: "none" }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMut.isPending}
            onClick={() => deleteTarget && deleteMut.mutate(deleteTarget)}
            startIcon={
              deleteMut.isPending ? (
                <CircularProgress size={14} color="inherit" />
              ) : undefined
            }
            sx={{ textTransform: "none" }}
          >
            {deleteMut.isPending ? "Удаление..." : "Удалить"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
