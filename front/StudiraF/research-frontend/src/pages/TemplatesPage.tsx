import { useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Collapse,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  ExpandMore,
  ExpandLess,
  Article,
  Lock,
  AddCircleOutlined,
  RemoveCircleOutlined,
} from "@mui/icons-material";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type TemplateStagePayload,
} from "../api/templates";
import type { PlanTemplateListItem, TaskType } from "../types";
import { useAuth } from "../contexts/AuthContext";

// ─── Types for the stage/task editor ─────────────────────────────────────────

interface TaskDraft {
  id: string; // local uuid
  title: string;
  task_type: TaskType;
}

interface StageDraft {
  id: string;
  name: string;
  duration_days: number;
  tasks: TaskDraft[];
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function defaultStages(): StageDraft[] {
  return [
    {
      id: uid(),
      name: "",
      duration_days: 14,
      tasks: [{ id: uid(), title: "", task_type: "FILE" }],
    },
  ];
}

// ─── Stage / Task editor ──────────────────────────────────────────────────────

function StageEditor({
  stages,
  onChange,
}: {
  stages: StageDraft[];
  onChange: (s: StageDraft[]) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setOpen((p) => ({ ...p, [id]: !p[id] }));

  const updateStage = (id: string, patch: Partial<StageDraft>) =>
    onChange(stages.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addStage = () => {
    const s: StageDraft = { id: uid(), name: "", duration_days: 14, tasks: [{ id: uid(), title: "" }] };
    onChange([...stages, s]);
    setOpen((p) => ({ ...p, [s.id]: true }));
  };

  const removeStage = (id: string) => onChange(stages.filter((s) => s.id !== id));

  const addTask = (stageId: string) =>
    updateStage(stageId, {
      tasks: [...(stages.find((s) => s.id === stageId)?.tasks ?? []), { id: uid(), title: "", task_type: "FILE" as TaskType }],
    });

  const removeTask = (stageId: string, taskId: string) =>
    updateStage(stageId, {
      tasks: stages.find((s) => s.id === stageId)!.tasks.filter((t) => t.id !== taskId),
    });

  const updateTask = (stageId: string, taskId: string, patch: Partial<Omit<TaskDraft, "id">>) =>
    updateStage(stageId, {
      tasks: stages.find((s) => s.id === stageId)!.tasks.map((t) =>
        t.id === taskId ? { ...t, ...patch } : t
      ),
    });

  return (
    <Box>
      {stages.map((stage, si) => (
        <Paper
          key={stage.id}
          variant="outlined"
          sx={{ mb: 1.5, borderRadius: 2, overflow: "hidden" }}
        >
          {/* Stage header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              bgcolor: "#F4F5F7",
              cursor: "pointer",
            }}
            onClick={() => toggle(stage.id)}
          >
            <Typography
              variant="body2"
              sx={{ color: "#42526E", fontWeight: 600, minWidth: 24 }}
            >
              {si + 1}.
            </Typography>
            <TextField
              size="small"
              placeholder="Название этапа"
              value={stage.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => updateStage(stage.id, { name: e.target.value })}
              sx={{ flex: 1, "& .MuiInputBase-root": { bgcolor: "#fff" } }}
            />
            <TextField
              size="small"
              type="number"
              label="Дней"
              value={stage.duration_days}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                updateStage(stage.id, { duration_days: Math.max(1, parseInt(e.target.value) || 14) })
              }
              sx={{ width: 80, "& .MuiInputBase-root": { bgcolor: "#fff" } }}
              inputProps={{ min: 1 }}
            />
            <Tooltip title="Удалить этап">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  removeStage(stage.id);
                }}
                sx={{ color: "#DE350B" }}
              >
                <RemoveCircleOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            {open[stage.id] ? (
              <ExpandLess fontSize="small" sx={{ color: "#42526E" }} />
            ) : (
              <ExpandMore fontSize="small" sx={{ color: "#42526E" }} />
            )}
          </Box>

          {/* Tasks */}
          <Collapse in={!!open[stage.id]}>
            <Box sx={{ px: 2, py: 1.5 }}>
              {stage.tasks.map((task, ti) => (
                <Box key={task.id} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                  <Typography variant="body2" sx={{ color: "#6B778C", minWidth: 28 }}>
                    {si + 1}.{ti + 1}
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Название задачи"
                    value={task.title}
                    onChange={(e) => updateTask(stage.id, task.id, { title: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={task.task_type ?? "FILE"}
                      onChange={(e) =>
                        updateTask(stage.id, task.id, { task_type: e.target.value as TaskType })
                      }
                    >
                      <MenuItem value="FILE">Файл</MenuItem>
                      <MenuItem value="PUBLICATION">Публикация</MenuItem>
                    </Select>
                  </FormControl>
                  <Tooltip title="Удалить задачу">
                    <IconButton
                      size="small"
                      onClick={() => removeTask(stage.id, task.id)}
                      sx={{ color: "#97A0AF" }}
                      disabled={stage.tasks.length === 1}
                    >
                      <RemoveCircleOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
              <Button
                size="small"
                startIcon={<AddCircleOutlined />}
                onClick={() => addTask(stage.id)}
                sx={{ mt: 0.5, color: "#0052CC" }}
              >
                Добавить задачу
              </Button>
            </Box>
          </Collapse>
        </Paper>
      ))}

      <Button
        startIcon={<Add />}
        onClick={addStage}
        variant="outlined"
        size="small"
        fullWidth
        sx={{ mt: 1 }}
      >
        Добавить этап
      </Button>
    </Box>
  );
}

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: number | null;
}

function TemplateDialog({ open, onClose, editId }: TemplateDialogProps) {
  const qc = useQueryClient();
  const isEdit = !!editId;

  const { data: existing } = useQuery({
    queryKey: ["template", editId],
    queryFn: () => getTemplate(editId!),
    enabled: isEdit && open,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState<StageDraft[]>(defaultStages);

  // Populate form when existing data loads
  const [initialized, setInitialized] = useState(false);
  if (isEdit && existing && !initialized) {
    setName(existing.name);
    setDescription(existing.description);
    setStages(
      existing.stages.map((s) => ({
        id: uid(),
        name: s.name,
        duration_days: s.duration_days,
        tasks: s.tasks.map((t) => ({ id: uid(), title: t.title, task_type: t.task_type ?? ("FILE" as TaskType) })),
      }))
    );
    setInitialized(true);
  }

  // Reset when dialog opens fresh
  const handleClose = () => {
    setName("");
    setDescription("");
    setStages(defaultStages());
    setInitialized(false);
    onClose();
  };

  const toPayload = (): TemplateStagePayload[] =>
    stages.map((s, i) => ({
      name: s.name.trim() || `Этап ${i + 1}`,
      order: i + 1,
      duration_days: s.duration_days,
      tasks: s.tasks.map((t, j) => ({
        title: t.title.trim() || `Задача ${j + 1}`,
        order: j + 1,
        task_type: t.task_type ?? "FILE",
      })),
    }));

  const createMut = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-templates"] });
      handleClose();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTemplate>[1] }) =>
      updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-templates"] });
      qc.invalidateQueries({ queryKey: ["template", editId] });
      handleClose();
    },
  });

  const handleSave = () => {
    if (!name.trim()) return;
    const payload = { name: name.trim(), description: description.trim(), stages: toPayload() };
    if (isEdit) {
      updateMut.mutate({ id: editId!, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {isEdit ? "Редактировать шаблон" : "Новый шаблон"}
      </DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>
        <TextField
          label="Название шаблона"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
        <TextField
          label="Описание (необязательно)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={2}
          sx={{ mb: 3 }}
        />
        <Typography variant="subtitle2" sx={{ mb: 1, color: "#42526E", fontWeight: 600 }}>
          Этапы и задачи
        </Typography>
        <StageEditor stages={stages} onChange={setStages} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim() || saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isEdit ? "Сохранить" : "Создать"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteDialog({
  open,
  name,
  onConfirm,
  onClose,
  loading,
}: {
  open: boolean;
  name: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Удалить шаблон</DialogTitle>
      <DialogContent>
        <Typography>
          Вы уверены, что хотите удалить шаблон <b>«{name}»</b>? Это действие необратимо.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Удалить
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Template Detail Panel ────────────────────────────────────────────────────

function TemplateDetail({
  templateId,
  canEdit,
  onEdit,
  onDelete,
}: {
  templateId: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => getTemplate(templateId),
  });

  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  if (isLoading) return <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>;
  if (!data) return null;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#172B4D" }}>
              {data.name}
            </Typography>
            {data.is_system && (
              <Chip
                icon={<Lock sx={{ fontSize: 14 }} />}
                label="Системный"
                size="small"
                sx={{ bgcolor: "#EAE6FF", color: "#403294", fontWeight: 600 }}
              />
            )}
          </Box>
          {data.description && (
            <Typography variant="body2" sx={{ color: "#6B778C" }}>
              {data.description}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: "#97A0AF" }}>
            {data.created_by
              ? `Создан: ${data.created_by.full_name || data.created_by.username}`
              : "Системный шаблон"}{" "}
            · {data.stages.length} этапов
          </Typography>
        </Box>
        {canEdit && !data.is_system && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Редактировать">
              <IconButton size="small" onClick={onEdit} sx={{ color: "#0052CC" }}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Удалить">
              <IconButton size="small" onClick={onDelete} sx={{ color: "#DE350B" }}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Stages */}
      {data.stages.map((stage, si) => (
        <Paper
          key={stage.id}
          variant="outlined"
          sx={{ mb: 1.5, borderRadius: 2, overflow: "hidden" }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 1.5,
              cursor: "pointer",
              "&:hover": { bgcolor: "#F4F5F7" },
            }}
            onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                bgcolor: "#DEEBFF",
                color: "#0052CC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {si + 1}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#172B4D" }}>
                {stage.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "#97A0AF" }}>
                {stage.duration_days} дн. · {stage.tasks.length} задач
              </Typography>
            </Box>
            {expandedStage === stage.id ? (
              <ExpandLess fontSize="small" sx={{ color: "#42526E" }} />
            ) : (
              <ExpandMore fontSize="small" sx={{ color: "#42526E" }} />
            )}
          </Box>

          <Collapse in={expandedStage === stage.id}>
            <Divider />
            <Box sx={{ px: 2, py: 1.5 }}>
              {stage.tasks.map((task, ti) => (
                <Box key={task.id} sx={{ display: "flex", gap: 1.5, mb: 0.5, alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: "#97A0AF", minWidth: 28 }}>
                    {si + 1}.{ti + 1}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#42526E", flex: 1 }}>
                    {task.title}
                  </Typography>
                  {task.task_type === "PUBLICATION" && (
                    <Chip
                      label="Публикация"
                      size="small"
                      sx={{ bgcolor: "#EAE6FF", color: "#403294", fontWeight: 600, fontSize: 10 }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Collapse>
        </Paper>
      ))}
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  usePageTitle("Шаблоны плана");
  const { user } = useAuth();
  const qc = useQueryClient();
  // Any supervisor/head can create a template
  const canCreate = user?.role === "SPV" || user?.role === "HOD";

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanTemplateListItem | null>(null);

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["plan-templates"],
    queryFn: getTemplates,
  });

  // HOD can edit any template; SPV — only their own
  const selectedTemplate = templates.find((t) => t.id === selectedId);
  const canEditSelected =
    user?.role === "HOD" ||
    (user?.role === "SPV" && selectedTemplate?.created_by?.id === user?.id);

  const deleteMut = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-templates"] });
      if (selectedId === deleteTarget?.id) setSelectedId(null);
      setDeleteTarget(null);
    },
  });

  const handleCreate = () => {
    setEditId(null);
    setDialogOpen(true);
  };

  const handleEdit = () => {
    setEditId(selectedId);
    setDialogOpen(true);
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#172B4D" }}>
            Шаблоны плана
          </Typography>
          <Typography variant="body2" sx={{ color: "#6B778C" }}>
            Готовые шаблоны для быстрого создания плана исследования
          </Typography>
        </Box>
        {canCreate && (
          <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
            Новый шаблон
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Не удалось загрузить шаблоны
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3, alignItems: "flex-start" }}>
        {/* Sidebar list */}
        <Paper
          variant="outlined"
          sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0, borderRadius: 2, overflow: "hidden" }}
        >
          {isLoading ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <CircularProgress size={28} />
            </Box>
          ) : templates.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ color: "#97A0AF", textAlign: "center" }}>
                Нет шаблонов
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {templates.map((tpl, idx) => (
                <Box key={tpl.id}>
                  {idx > 0 && <Divider />}
                  <ListItemButton
                    selected={selectedId === tpl.id}
                    onClick={() => setSelectedId(tpl.id)}
                    sx={{
                      py: 1.5,
                      "&.Mui-selected": { bgcolor: "#DEEBFF" },
                      "&.Mui-selected:hover": { bgcolor: "#B3D4FF" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, width: "100%" }}>
                      <Article sx={{ color: tpl.is_system ? "#5243AA" : "#0052CC", mt: 0.3, flexShrink: 0 }} />
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: selectedId === tpl.id ? 700 : 500, color: "#172B4D" }}
                            >
                              {tpl.name}
                            </Typography>
                            {tpl.is_system && (
                              <Lock sx={{ fontSize: 12, color: "#5243AA" }} />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: "#97A0AF" }}>
                            {tpl.stages_count} этапов
                          </Typography>
                        }
                      />
                    </Box>
                  </ListItemButton>
                </Box>
              ))}
            </List>
          )}
        </Paper>

        {/* Detail panel */}
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          {selectedId ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <TemplateDetail
                templateId={selectedId}
                canEdit={canEditSelected}
                onEdit={handleEdit}
                onDelete={() => setDeleteTarget(templates.find((t) => t.id === selectedId) ?? null)}
              />
            </Paper>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 6,
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                color: "#97A0AF",
              }}
            >
              <Article sx={{ fontSize: 56, mb: 2, opacity: 0.4 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Выберите шаблон
              </Typography>
              <Typography variant="body2">
                Нажмите на шаблон в списке, чтобы просмотреть его структуру
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Create / Edit dialog */}
      <TemplateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editId={editId}
      />

      {/* Delete confirmation */}
      <DeleteDialog
        open={!!deleteTarget}
        name={deleteTarget?.name ?? ""}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
        loading={deleteMut.isPending}
      />
    </Box>
  );
}
