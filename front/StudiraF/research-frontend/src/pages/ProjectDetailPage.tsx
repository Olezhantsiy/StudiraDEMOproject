import { useState, useMemo, useRef } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useParams, useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  ArrowBack,
  ExpandMore,
  ChevronRight,
  Add,
  Delete,
  Close,
  Assignment,
  AttachFile,
  Download,
  Send,
  AutoAwesome,
  Description,
  Article,
  RateReview,
  Edit,
  CheckCircle,
  Cancel,
  EditOutlined,
  FileDownload,
} from "@mui/icons-material";
import { getProject, updateProject, type UpdateProjectPayload } from "../api/projects";
import {
  getStages,
  createStage,
  updateStage,
  deleteStage,
  generateTemplate,
  downloadStageReport,
  type StagePayload,
} from "../api/stages";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  type TaskPayload,
} from "../api/tasks";
import {
  getSubmissions,
  createSubmission,
  downloadFile,
  getReviews,
  createReview,
  updateReview,
} from "../api/submissions";
import {
  getTaskPublications,
  createTaskPublication,
  updateTaskPublication,
  deleteTaskPublication,
  getIndexingSystems,
  type PublicationPayload,
} from "../api/publications";
import { useAuth } from "../contexts/AuthContext";
import {
  type ResearchStage,
  type StageTask,
  type TaskSubmission,
  type SubmissionReview,
  type ReviewDecision,
  type StageStatus,
  type TaskStatus,
  type TaskType,
  type Publication,
  type PublicationType,
  type PublicationStatus,
  type IndexingSystem,
  StageStatusLabels,
  StageStatusColors,
  TaskStatusLabels,
  TaskStatusColors,
  TaskTypeLabels,
  SubmissionStatusLabels,
  SubmissionStatusColors,
  ReviewDecisionLabels,
  ReviewDecisionColors,
  ProjectStatusLabels,
  ProjectStatusColors,
  PublicationTypeLabels,
  PublicationTypeColors,
  PublicationStatusLabels,
  PublicationStatusColors,
} from "../types";

// ─────────────────────────────────────────────
// Panel state type
// ─────────────────────────────────────────────
type PanelState =
  | { type: "none" }
  | { type: "new-stage" }
  | { type: "stage"; stageId: number }
  | { type: "new-task"; stageId: number }
  | { type: "task"; stageId: number; taskId: number };

// ─────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────
function SChip({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{ bgcolor: bg, color, fontWeight: 600, fontSize: 11, height: 22 }}
    />
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isStudent = user?.role === "STD";

  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  const [panel, setPanel] = useState<PanelState>({ type: "none" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateProjectPayload>({});

  // ── Queries ─────────────────────────────────
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });

  usePageTitle(project?.title ?? null);

  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ["stages", projectId],
    queryFn: () => getStages(projectId),
    enabled: !!projectId,
  });

  const taskResults = useQueries({
    queries: stages.map((s) => ({
      queryKey: ["tasks", projectId, s.id],
      queryFn: () => getTasks(projectId, s.id),
    })),
  });

  const tasksByStage = useMemo(() => {
    const map: Record<number, StageTask[]> = {};
    stages.forEach((s, i) => {
      map[s.id] = taskResults[i]?.data ?? [];
    });
    return map;
  }, [stages, taskResults]);

  // ── Mutations ───────────────────────────────
  const updateProjectMut = useMutation({
    mutationFn: (data: UpdateProjectPayload) => updateProject(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditDialogOpen(false);
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generateTemplate(projectId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["stages", projectId] }),
  });

  const delStageMutation = useMutation({
    mutationFn: (stageId: number) => deleteStage(projectId, stageId),
    onSuccess: (_, stageId) => {
      queryClient.invalidateQueries({ queryKey: ["stages", projectId] });
      if (panel.type === "stage" && panel.stageId === stageId)
        setPanel({ type: "none" });
    },
  });

  const delTaskMutation = useMutation({
    mutationFn: ({ stageId, taskId }: { stageId: number; taskId: number }) =>
      deleteTask(projectId, stageId, taskId),
    onSuccess: (_, { stageId, taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId, stageId] });
      if (panel.type === "task" && panel.taskId === taskId)
        setPanel({ type: "none" });
    },
  });

  // ── Helpers ──────────────────────────────────
  const toggleStage = (id: number) =>
    setExpandedStages((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Loading / error ──────────────────────────
  if (projectLoading || stagesLoading) {
    return (
      <Box>
        <Skeleton height={80} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton height={56} sx={{ borderRadius: 2, mb: 1 }} />
        <Skeleton height={56} sx={{ borderRadius: 2, mb: 1 }} />
        <Skeleton height={56} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!project) return <Alert severity="error">Проект не найден</Alert>;

  // isSupervisor: HOD has full rights on all dept projects;
  // SPV only has rights on projects where they are the supervisor.
  const isSupervisor =
    user?.role === "HOD" ||
    (user?.role === "SPV" && project.supervisor?.id === user?.id);

  const pColor =
    ProjectStatusColors[project.status] ?? { bg: "#F4F5F7", color: "#42526E" };
  const studentName =
    project.enrollment?.student?.full_name?.trim() ||
    project.enrollment?.student?.username ||
    "—";
  const supervisorName =
    project.supervisor?.full_name?.trim() ||
    project.supervisor?.username ||
    "—";

  const panelOpen = panel.type !== "none";

  // Key для RightPanel — remount при смене выбора
  const panelKey =
    panel.type === "stage"
      ? `stage-${panel.stageId}`
      : panel.type === "task"
      ? `task-${panel.stageId}-${panel.taskId}`
      : panel.type === "new-task"
      ? `new-task-${panel.stageId}`
      : panel.type;

  const rightPanel = panelOpen ? (
    <RightPanel
      key={panelKey}
      panel={panel as Exclude<PanelState, { type: "none" }>}
      projectId={projectId}
      stages={stages}
      tasksByStage={tasksByStage}
      isSupervisor={isSupervisor}
      isStudent={isStudent}
      onClose={() => setPanel({ type: "none" })}
    />
  ) : null;

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, alignItems: "flex-start" }}>
      {/* ─── LEFT: Tree ─── */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Project header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <IconButton size="small" onClick={() => navigate("/projects")}>
              <ArrowBack fontSize="small" sx={{ color: "#42526E" }} />
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              Все проекты
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}
              >
                <Typography variant="h5" fontWeight={700} color="#172B4D" sx={{ fontSize: { xs: "1.15rem", sm: "1.5rem" } }}>
                  {project.title}
                </Typography>
                <SChip
                  label={ProjectStatusLabels[project.status] ?? project.status}
                  bg={pColor.bg}
                  color={pColor.color}
                />
              </Box>
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Typography variant="body2" color="text.secondary">
                  Студент:{" "}
                  <Typography
                    component="span"
                    variant="body2"
                    fontWeight={600}
                    color="#172B4D"
                  >
                    {studentName}
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Руководитель:{" "}
                  <Typography
                    component="span"
                    variant="body2"
                    fontWeight={600}
                    color="#172B4D"
                  >
                    {supervisorName}
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Начало:{" "}
                  <Typography
                    component="span"
                    variant="body2"
                    fontWeight={600}
                    color="#172B4D"
                  >
                    {fmtDate(project.start_date)}
                  </Typography>
                </Typography>
              </Box>
              {project.keywords && (
                <Typography variant="caption" color="text.secondary" mt={0.5}>
                  Ключевые слова: {project.keywords}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Article />}
                onClick={() => navigate(`/projects/${projectId}/publications`)}
                sx={{
                  textTransform: "none",
                  borderColor: "#DFE1E6",
                  color: "#42526E",
                  "&:hover": { borderColor: "#0052CC", color: "#0052CC" },
                }}
              >
                Публикации
              </Button>

              {isSupervisor && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditOutlined />}
                  onClick={() => {
                    setEditForm({
                      title: project.title,
                      description: project.description,
                      keywords: project.keywords,
                      start_date: project.start_date,
                      status: project.status,
                    });
                    setEditDialogOpen(true);
                  }}
                  sx={{
                    textTransform: "none",
                    borderColor: "#DFE1E6",
                    color: "#42526E",
                    "&:hover": { borderColor: "#0052CC", color: "#0052CC" },
                  }}
                >
                  Редактировать
                </Button>
              )}

              {isSupervisor && stages.length === 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                    generateMutation.isPending ? (
                      <CircularProgress size={14} />
                    ) : (
                      <AutoAwesome />
                    )
                  }
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  sx={{
                    textTransform: "none",
                    borderColor: "#0052CC",
                    color: "#0052CC",
                  }}
                >
                  Сгенерировать шаблонный план
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        {/* Stages */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {stages
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((stage) => {
              const expanded = expandedStages.has(stage.id);
              const selected =
                panel.type === "stage" && panel.stageId === stage.id;
              const tasks = tasksByStage[stage.id] ?? [];
              const sc =
                StageStatusColors[stage.status] ?? {
                  bg: "#F4F5F7",
                  color: "#42526E",
                };

              return (
                <Paper
                  key={stage.id}
                  elevation={0}
                  sx={{
                    border: selected
                      ? "1.5px solid #0052CC"
                      : "1px solid #DFE1E6",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  {/* Stage row */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 1.5,
                      py: 1,
                      bgcolor: selected ? "#F0F5FF" : "#FAFBFC",
                      cursor: "pointer",
                      gap: 0.5,
                      "&:hover": { bgcolor: selected ? "#F0F5FF" : "#F4F5F7" },
                    }}
                    onClick={() =>
                      setPanel({ type: "stage", stageId: stage.id })
                    }
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStage(stage.id);
                      }}
                      sx={{ p: 0.3, color: "#42526E", flexShrink: 0 }}
                    >
                      {expanded ? (
                        <ExpandMore fontSize="small" />
                      ) : (
                        <ChevronRight fontSize="small" />
                      )}
                    </IconButton>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="#172B4D"
                      sx={{ flex: 1, minWidth: 0 }}
                      noWrap
                    >
                      {stage.order}. {stage.name}
                    </Typography>
                    <SChip
                      label={StageStatusLabels[stage.status] ?? stage.status}
                      bg={sc.bg}
                      color={sc.color}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1, whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      до{" "}
                      {new Date(stage.deadline).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </Typography>

                    {isSupervisor && (
                      <Box
                        sx={{ display: "flex", ml: 0.5, flexShrink: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip title="Добавить задачу">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setPanel({
                                type: "new-task",
                                stageId: stage.id,
                              })
                            }
                            sx={{ color: "#0052CC" }}
                          >
                            <Add sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить этап">
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Удалить этап «${stage.name}»? Все задачи будут удалены.`
                                )
                              )
                                delStageMutation.mutate(stage.id);
                            }}
                            sx={{ color: "#BF2600" }}
                          >
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>

                  {/* Tasks (expanded) */}
                  {expanded && (
                    <Box>
                      <Divider />
                      {tasks.length === 0 ? (
                        <Box sx={{ pl: 7, py: 1.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Задач пока нет
                          </Typography>
                        </Box>
                      ) : (
                        tasks.map((task, idx) => {
                          const taskSelected =
                            panel.type === "task" &&
                            panel.taskId === task.id;
                          const tc =
                            TaskStatusColors[task.status] ?? {
                              bg: "#F4F5F7",
                              color: "#42526E",
                            };
                          return (
                            <Box key={task.id}>
                              {idx > 0 && <Divider sx={{ mx: 2 }} />}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  pl: 5.5,
                                  pr: 1.5,
                                  py: 0.8,
                                  gap: 0.8,
                                  bgcolor: taskSelected ? "#F0F5FF" : "#fff",
                                  cursor: "pointer",
                                  "&:hover": {
                                    bgcolor: taskSelected
                                      ? "#F0F5FF"
                                      : "#F8F9FA",
                                  },
                                }}
                                onClick={() =>
                                  setPanel({
                                    type: "task",
                                    stageId: stage.id,
                                    taskId: task.id,
                                  })
                                }
                              >
                                <Assignment
                                  sx={{
                                    fontSize: 15,
                                    color: "#0052CC",
                                    flexShrink: 0,
                                  }}
                                />
                                <Typography
                                  variant="body2"
                                  color="#172B4D"
                                  sx={{ flex: 1, minWidth: 0 }}
                                  noWrap
                                >
                                  {task.title}
                                </Typography>
                                <SChip
                                  label={
                                    TaskStatusLabels[task.status] ?? task.status
                                  }
                                  bg={tc.bg}
                                  color={tc.color}
                                />
                                {task.deadline && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      ml: 0.5,
                                      whiteSpace: "nowrap",
                                      flexShrink: 0,
                                    }}
                                  >
                                    до{" "}
                                    {new Date(
                                      task.deadline
                                    ).toLocaleDateString("ru-RU", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                  </Typography>
                                )}
                                {isSupervisor && (
                                  <Box
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Tooltip title="Удалить задачу">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          if (
                                            window.confirm(
                                              `Удалить задачу «${task.title}»?`
                                            )
                                          )
                                            delTaskMutation.mutate({
                                              stageId: stage.id,
                                              taskId: task.id,
                                            });
                                        }}
                                        sx={{
                                          color: "#BF2600",
                                          opacity: 0.6,
                                          "&:hover": { opacity: 1 },
                                        }}
                                      >
                                        <Delete sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          );
                        })
                      )}

                      {isSupervisor && (
                        <Box sx={{ pl: 5.5, py: 1 }}>
                          <Button
                            size="small"
                            startIcon={<Add />}
                            onClick={() =>
                              setPanel({
                                type: "new-task",
                                stageId: stage.id,
                              })
                            }
                            sx={{
                              textTransform: "none",
                              color: "#42526E",
                              "&:hover": { bgcolor: "#F4F5F7" },
                            }}
                          >
                            Добавить задачу
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>
              );
            })}

          {/* Add stage */}
          {isSupervisor && (
            <Box sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                size="small"
                onClick={() => setPanel({ type: "new-stage" })}
                sx={{
                  textTransform: "none",
                  borderColor: "#DFE1E6",
                  color: "#42526E",
                  "&:hover": { borderColor: "#0052CC", color: "#0052CC" },
                }}
              >
                Добавить этап
              </Button>
            </Box>
          )}

          {stages.length === 0 && !isSupervisor && (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography variant="body2" color="text.secondary">
                Этапы проекта ещё не созданы руководителем
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ─── RIGHT: Panel ─── */}
      {isMobile ? (
        <Drawer
          anchor="right"
          open={panelOpen}
          onClose={() => setPanel({ type: "none" })}
          PaperProps={{
            sx: {
              width: "100%",
              maxWidth: 480,
              p: 2,
            },
          }}
        >
          {rightPanel}
        </Drawer>
      ) : (
        panelOpen && (
          <Box
            sx={{
              width: 400,
              flexShrink: 0,
              position: "sticky",
              top: 16,
              maxHeight: "calc(100vh - 88px)",
              overflowY: "auto",
            }}
          >
            {rightPanel}
          </Box>
        )
      )}

      {/* ─── Edit project dialog ─── */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Редактировать проект</DialogTitle>
        <DialogContent sx={{ pt: "16px !important", display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Название"
            size="small"
            fullWidth
            required
            value={editForm.title ?? ""}
            onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
          />
          <TextField
            label="Описание"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={editForm.description ?? ""}
            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
          />
          <TextField
            label="Ключевые слова"
            size="small"
            fullWidth
            value={editForm.keywords ?? ""}
            onChange={(e) => setEditForm((p) => ({ ...p, keywords: e.target.value }))}
            placeholder="Через запятую"
          />
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
            <TextField
              label="Дата начала"
              size="small"
              type="date"
              fullWidth
              value={editForm.start_date ?? ""}
              onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { placeholder: "" } }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={editForm.status ?? ""}
                label="Статус"
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as typeof project.status }))}
              >
                {(["DRAFT", "APPROVED", "IN_PROGRESS", "PRE_DEFENSE", "DEFENDED", "REJECTED"] as const).map((s) => (
                  <MenuItem key={s} value={s}>{ProjectStatusLabels[s] ?? s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={updateProjectMut.isPending}>
            Отмена
          </Button>
          <Button
            variant="contained"
            disabled={!editForm.title?.trim() || updateProjectMut.isPending}
            onClick={() => updateProjectMut.mutate(editForm)}
            startIcon={updateProjectMut.isPending ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─────────────────────────────────────────────
// RIGHT PANEL
// ─────────────────────────────────────────────
interface RPProps {
  panel: Exclude<PanelState, { type: "none" }>;
  projectId: number;
  stages: ResearchStage[];
  tasksByStage: Record<number, StageTask[]>;
  isSupervisor: boolean;
  isStudent: boolean;
  onClose: () => void;
}

function RightPanel({
  panel,
  projectId,
  stages,
  tasksByStage,
  isSupervisor,
  isStudent,
  onClose,
}: RPProps) {
  const queryClient = useQueryClient();

  // ── Stage form ──────────────────────────────
  const existingStage =
    panel.type === "stage"
      ? stages.find((s) => s.id === panel.stageId)
      : undefined;

  const [sf, setSf] = useState<StagePayload>({
    name: existingStage?.name ?? "",
    order: existingStage?.order ?? stages.length + 1,
    start_date: existingStage?.start_date ?? "",
    deadline: existingStage?.deadline ?? "",
    status: existingStage?.status ?? "PENDING",
  });

  // ── Task form ───────────────────────────────
  const existingTask =
    panel.type === "task"
      ? (tasksByStage[(panel as { stageId: number }).stageId] ?? []).find(
          (t) => t.id === (panel as { taskId: number }).taskId
        )
      : undefined;

  const [tf, setTf] = useState<TaskPayload>({
    title: existingTask?.title ?? "",
    description: existingTask?.description ?? "",
    deadline: existingTask?.deadline ?? "",
    status: existingTask?.status ?? "TODO",
    task_type: existingTask?.task_type ?? "FILE",
  });

  // ── Submission form ─────────────────────────
  const [subText, setSubText] = useState("");
  const [subFile, setSubFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Review form ──────────────────────────────
  const [reviewingSubId, setReviewingSubId] = useState<number | null>(null);
  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>("APPROVED");
  const [reviewComment, setReviewComment] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  // ── Publication form (for PUBLICATION tasks) ─
  const [pubDialogOpen, setPubDialogOpen] = useState(false);
  const [editingPubId, setEditingPubId] = useState<number | null>(null);
  const [pubForm, setPubForm] = useState<PublicationPayload>({
    title: "",
    url: "",
    doi: "",
    type: "ARTICLE",
    status: "DRAFT",
    year: null,
    publisher: "",
  });

  // ── Mutations ───────────────────────────────
  const createStageMut = useMutation({
    mutationFn: (d: StagePayload) => createStage(projectId, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages", projectId] });
      onClose();
    },
  });

  const updateStageMut = useMutation({
    mutationFn: (d: StagePayload) =>
      updateStage(
        projectId,
        (panel as { stageId: number }).stageId,
        d
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["stages", projectId] }),
  });

  const createTaskMut = useMutation({
    mutationFn: (d: TaskPayload) =>
      createTask(projectId, (panel as { stageId: number }).stageId, d),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "tasks",
          projectId,
          (panel as { stageId: number }).stageId,
        ],
      });
      onClose();
    },
  });

  const updateTaskMut = useMutation({
    mutationFn: (d: TaskPayload) =>
      updateTask(
        projectId,
        (panel as { stageId: number }).stageId,
        (panel as { taskId: number }).taskId,
        d
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [
          "tasks",
          projectId,
          (panel as { stageId: number }).stageId,
        ],
      }),
  });

  // ── Submissions query (task panel only) ─────
  const stageIdForSub =
    panel.type === "task" ? (panel as { stageId: number }).stageId : 0;
  const taskIdForSub =
    panel.type === "task" ? (panel as { taskId: number }).taskId : 0;

  const {
    data: submissions = [],
    isLoading: subsLoading,
    refetch: refetchSubs,
  } = useQuery({
    queryKey: ["submissions", projectId, stageIdForSub, taskIdForSub],
    queryFn: () => getSubmissions(projectId, stageIdForSub, taskIdForSub),
    enabled: panel.type === "task",
  });

  const createSubMut = useMutation({
    mutationFn: (fd: FormData) =>
      createSubmission(projectId, stageIdForSub, taskIdForSub, fd),
    onSuccess: () => {
      refetchSubs();
      queryClient.invalidateQueries({
        queryKey: ["tasks", projectId, stageIdForSub],
      });
      setSubText("");
      setSubFile(null);
    },
  });

  // ── Reviews queries (one per submission) ────
  const reviewQueries = useQueries({
    queries: submissions.map((sub) => ({
      queryKey: ["reviews", projectId, stageIdForSub, taskIdForSub, sub.id],
      queryFn: () => getReviews(projectId, stageIdForSub, taskIdForSub, sub.id),
      enabled: panel.type === "task" && submissions.length > 0,
    })),
  });

  const reviewsBySubId: Record<number, SubmissionReview | undefined> = {};
  submissions.forEach((sub, i) => {
    reviewsBySubId[sub.id] = reviewQueries[i]?.data?.[0];
  });

  const createReviewMut = useMutation({
    mutationFn: ({ subId, data }: { subId: number; data: { decision: ReviewDecision; comment: string } }) =>
      createReview(projectId, stageIdForSub, taskIdForSub, subId, data),
    onSuccess: (_, { subId }) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", projectId, stageIdForSub, taskIdForSub, subId] });
      queryClient.invalidateQueries({ queryKey: ["submissions", projectId, stageIdForSub, taskIdForSub] });
      refetchSubs();
      setReviewingSubId(null);
      setReviewComment("");
    },
  });

  const updateReviewMut = useMutation({
    mutationFn: ({ subId, reviewId, data }: { subId: number; reviewId: number; data: { decision: ReviewDecision; comment: string } }) =>
      updateReview(projectId, stageIdForSub, taskIdForSub, subId, reviewId, data),
    onSuccess: (_, { subId }) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", projectId, stageIdForSub, taskIdForSub, subId] });
      queryClient.invalidateQueries({ queryKey: ["submissions", projectId, stageIdForSub, taskIdForSub] });
      refetchSubs();
      setEditingReviewId(null);
      setReviewingSubId(null);
      setReviewComment("");
    },
  });

  // ── Publications (for PUBLICATION tasks) ────
  const isPublicationTask =
    panel.type === "task" && existingTask?.task_type === "PUBLICATION";

  const { data: indexingSystems = [] } = useQuery<IndexingSystem[]>({
    queryKey: ["indexing-systems"],
    queryFn: getIndexingSystems,
    enabled: isPublicationTask,
  });

  const {
    data: taskPubs = [],
    isLoading: pubsLoading,
    refetch: refetchPubs,
  } = useQuery({
    queryKey: ["task-publications", projectId, stageIdForSub, taskIdForSub],
    queryFn: () => getTaskPublications(projectId, stageIdForSub, taskIdForSub),
    enabled: isPublicationTask,
  });

  const createPubMut = useMutation({
    mutationFn: (data: PublicationPayload) =>
      createTaskPublication(projectId, stageIdForSub, taskIdForSub, data),
    onSuccess: () => {
      refetchPubs();
      setPubDialogOpen(false);
      setEditingPubId(null);
      setPubForm({ title: "", url: "", doi: "", type: "ARTICLE", status: "DRAFT", year: null, publisher: "" });
    },
  });

  const updatePubMut = useMutation({
    mutationFn: (data: PublicationPayload) =>
      updateTaskPublication(projectId, stageIdForSub, taskIdForSub, editingPubId!, data),
    onSuccess: () => {
      refetchPubs();
      setPubDialogOpen(false);
      setEditingPubId(null);
      setPubForm({ title: "", url: "", doi: "", type: "ARTICLE", status: "DRAFT", year: null, publisher: "" });
    },
  });

  const deletePubMut = useMutation({
    mutationFn: (pubId: number) =>
      deleteTaskPublication(projectId, stageIdForSub, taskIdForSub, pubId),
    onSuccess: () => refetchPubs(),
  });

  // ── Title ────────────────────────────────────
  const titles: Record<string, string> = {
    "new-stage": "Новый этап",
    stage: "Редактировать этап",
    "new-task": "Новая задача",
    task: "Задача",
  };
  const stageCtx =
    panel.type === "new-task" || panel.type === "task"
      ? stages.find(
          (s) => s.id === (panel as { stageId: number }).stageId
        )
      : undefined;

  return (
    <Paper
      elevation={0}
      sx={{ border: "1px solid #DFE1E6", borderRadius: 2, overflow: "hidden" }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1.2,
          bgcolor: "#F8F9FA",
          borderBottom: "1px solid #DFE1E6",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} color="#172B4D">
            {titles[panel.type] ?? ""}
          </Typography>
          {stageCtx && (
            <Typography variant="caption" color="text.secondary" noWrap>
              Этап: {stageCtx.name}
            </Typography>
          )}
        </Box>
        {panel.type === "stage" && (
          <StageReportIconButton
            projectId={projectId}
            stageId={(panel as { stageId: number }).stageId}
          />
        )}
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ p: 2 }}>
        {/* ─── Stage form ─── */}
        {(panel.type === "stage" || panel.type === "new-stage") && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.8 }}>
            <TextField
              label="Название этапа"
              size="small"
              fullWidth
              value={sf.name}
              onChange={(e) => setSf((p) => ({ ...p, name: e.target.value }))}
              disabled={!isSupervisor}
            />
            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5 }}>
              <TextField
                label="Порядок"
                size="small"
                type="number"
                value={sf.order}
                onChange={(e) =>
                  setSf((p) => ({ ...p, order: Number(e.target.value) }))
                }
                disabled={!isSupervisor}
                sx={{ width: 90 }}
              />
              <FormControl size="small" fullWidth disabled={!isSupervisor}>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={sf.status}
                  label="Статус"
                  onChange={(e) =>
                    setSf((p) => ({
                      ...p,
                      status: e.target.value as StageStatus,
                    }))
                  }
                >
                  {(
                    [
                      "PENDING",
                      "IN_PROGRESS",
                      "COMPLETED",
                      "OVERDUE",
                    ] as StageStatus[]
                  ).map((s) => (
                    <MenuItem key={s} value={s}>
                      {StageStatusLabels[s]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5 }}>
              <TextField
                label="Дата начала"
                size="small"
                type="date"
                fullWidth
                value={sf.start_date}
                onChange={(e) =>
                  setSf((p) => ({ ...p, start_date: e.target.value }))
                }
                disabled={!isSupervisor}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { placeholder: "" },
                }}
              />
              <TextField
                label="Дедлайн"
                size="small"
                type="date"
                fullWidth
                value={sf.deadline}
                onChange={(e) =>
                  setSf((p) => ({ ...p, deadline: e.target.value }))
                }
                disabled={!isSupervisor}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { placeholder: "" },
                }}
              />
            </Box>

            {isSupervisor && (
              <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  size="small"
                  disabled={!sf.name || createStageMut.isPending || updateStageMut.isPending}
                  onClick={() =>
                    panel.type === "new-stage"
                      ? createStageMut.mutate(sf)
                      : updateStageMut.mutate(sf)
                  }
                  sx={{
                    textTransform: "none",
                    bgcolor: "#0052CC",
                    "&:hover": { bgcolor: "#0747A6" },
                  }}
                >
                  {panel.type === "new-stage" ? "Создать" : "Сохранить"}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onClose}
                  sx={{ textTransform: "none" }}
                >
                  Отмена
                </Button>
              </Box>
            )}

          </Box>
        )}

        {/* ─── Task form ─── */}
        {(panel.type === "task" || panel.type === "new-task") && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.8 }}>
            <TextField
              label="Название задачи"
              size="small"
              fullWidth
              value={tf.title}
              onChange={(e) => setTf((p) => ({ ...p, title: e.target.value }))}
              disabled={!isSupervisor}
            />
            <TextField
              label="Описание"
              size="small"
              fullWidth
              multiline
              rows={3}
              value={tf.description}
              onChange={(e) =>
                setTf((p) => ({ ...p, description: e.target.value }))
              }
              disabled={!isSupervisor}
            />
            <TextField
              label="Дедлайн"
              size="small"
              type="date"
              fullWidth
              value={tf.deadline ?? ""}
              onChange={(e) =>
                setTf((p) => ({ ...p, deadline: e.target.value }))
              }
              disabled={!isSupervisor}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { placeholder: "" },
              }}
            />
            <FormControl size="small" fullWidth disabled={!isSupervisor}>
              <InputLabel>Статус</InputLabel>
              <Select
                value={tf.status}
                label="Статус"
                onChange={(e) =>
                  setTf((p) => ({
                    ...p,
                    status: e.target.value as TaskStatus,
                  }))
                }
              >
                {(
                  [
                    "TODO",
                    "IN_PROGRESS",
                    "DONE",
                    "OVERDUE",
                  ] as TaskStatus[]
                ).map((s) => (
                  <MenuItem key={s} value={s}>
                    {TaskStatusLabels[s]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth disabled={!isSupervisor}>
              <InputLabel>Тип задачи</InputLabel>
              <Select
                value={tf.task_type ?? "FILE"}
                label="Тип задачи"
                onChange={(e) =>
                  setTf((p) => ({ ...p, task_type: e.target.value as TaskType }))
                }
              >
                {(["FILE", "PUBLICATION"] as TaskType[]).map((t) => (
                  <MenuItem key={t} value={t}>
                    {TaskTypeLabels[t]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {isSupervisor && (
              <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                <Button
                  variant="contained"
                  size="small"
                  disabled={!tf.title || createTaskMut.isPending || updateTaskMut.isPending}
                  onClick={() =>
                    panel.type === "new-task"
                      ? createTaskMut.mutate(tf)
                      : updateTaskMut.mutate(tf)
                  }
                  sx={{
                    textTransform: "none",
                    bgcolor: "#0052CC",
                    "&:hover": { bgcolor: "#0747A6" },
                  }}
                >
                  {panel.type === "new-task" ? "Создать" : "Сохранить"}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onClose}
                  sx={{ textTransform: "none" }}
                >
                  Отмена
                </Button>
              </Box>
            )}

            {/* ─── Publications (PUBLICATION tasks) ─── */}
            {panel.type === "task" && isPublicationTask && (
              <>
                <Divider sx={{ mt: 0.5 }} />
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="subtitle2" fontWeight={700} color="#172B4D">
                    Публикации
                  </Typography>
                  {(isSupervisor || isStudent) && (
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => {
                        setEditingPubId(null);
                        setPubForm({ title: "", url: "", doi: "", type: "ARTICLE", status: "DRAFT", year: null, publisher: "" });
                        setPubDialogOpen(true);
                      }}
                      sx={{ textTransform: "none", fontSize: 12 }}
                    >
                      Добавить
                    </Button>
                  )}
                </Box>

                {pubsLoading ? (
                  <CircularProgress size={18} sx={{ alignSelf: "center" }} />
                ) : taskPubs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Публикаций пока нет
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {taskPubs.map((pub: Publication) => {
                      const sc = PublicationStatusColors[pub.status] ?? { bg: "#F4F5F7", color: "#42526E" };
                      const tc = PublicationTypeColors[pub.type] ?? { bg: "#F4F5F7", color: "#42526E" };
                      return (
                        <Box
                          key={pub.id}
                          sx={{ border: "1px solid #DFE1E6", borderRadius: 1.5, p: 1.5 }}
                        >
                          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 0.5 }}>
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              <Chip
                                label={PublicationTypeLabels[pub.type] ?? pub.type}
                                size="small"
                                sx={{ bgcolor: tc.bg, color: tc.color, fontWeight: 600, fontSize: 11 }}
                              />
                              <Chip
                                label={PublicationStatusLabels[pub.status] ?? pub.status}
                                size="small"
                                sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: 11 }}
                              />
                              {pub.year && (
                                <Chip label={String(pub.year)} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                              )}
                            </Box>
                            {(isSupervisor || isStudent) && (
                              <Box sx={{ display: "flex", gap: 0.5 }}>
                                <Tooltip title="Редактировать">
                                  <IconButton size="small" onClick={() => {
                                    setEditingPubId(pub.id);
                                    setPubForm({ title: pub.title, url: pub.url, doi: pub.doi, type: pub.type, status: pub.status, year: pub.year, index_ids: pub.indexes?.map((ix) => ix.id) ?? [], publisher: pub.publisher ?? "" });
                                    setPubDialogOpen(true);
                                  }}>
                                    <Edit sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Удалить">
                                  <IconButton size="small" onClick={() => deletePubMut.mutate(pub.id)}>
                                    <Delete sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                          <Typography variant="body2" color="#172B4D" sx={{ fontSize: 12, fontWeight: 600, mb: 0.3 }}>
                            {pub.title}
                          </Typography>
                          {pub.url && (
                            <Typography variant="caption" color="#0052CC" sx={{ wordBreak: "break-all" }}>
                              {pub.url}
                            </Typography>
                          )}
                          {pub.indexes && pub.indexes.length > 0 && (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4, mt: 0.5 }}>
                              {pub.indexes.map((ix) => (
                                <Chip
                                  key={ix.id}
                                  label={ix.name}
                                  size="small"
                                  sx={{ fontSize: 10, fontWeight: 600, height: 18, bgcolor: "#EAE6FF", color: "#403294" }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* Publication dialog */}
                <Dialog open={pubDialogOpen} onClose={() => setPubDialogOpen(false)} maxWidth="sm" fullWidth>
                  <DialogTitle sx={{ pb: 1 }}>
                    {editingPubId ? "Редактировать публикацию" : "Добавить публикацию"}
                  </DialogTitle>
                  <DialogContent sx={{ pt: "16px !important", display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                      label="Библиографическое описание"
                      size="small"
                      fullWidth
                      multiline
                      rows={3}
                      required
                      value={pubForm.title}
                      onChange={(e) => setPubForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Например: Иванов И.И. Название статьи // Журнал. 2024. №1. С. 1-10."
                    />
                    <TextField
                      label="URL"
                      size="small"
                      fullWidth
                      value={pubForm.url}
                      onChange={(e) => setPubForm((p) => ({ ...p, url: e.target.value }))}
                    />
                    <TextField
                      label="DOI"
                      size="small"
                      fullWidth
                      value={pubForm.doi ?? ""}
                      onChange={(e) => setPubForm((p) => ({ ...p, doi: e.target.value }))}
                    />
                    <TextField
                      label="Издательство / журнал"
                      size="small"
                      fullWidth
                      value={pubForm.publisher ?? ""}
                      onChange={(e) => setPubForm((p) => ({ ...p, publisher: e.target.value }))}
                      placeholder="Например: Вестник МГУ"
                    />
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Тип</InputLabel>
                        <Select
                          value={pubForm.type}
                          label="Тип"
                          onChange={(e) => setPubForm((p) => ({ ...p, type: e.target.value as PublicationType }))}
                        >
                          {(["ARTICLE", "THESIS", "CONFERENCE"] as PublicationType[]).map((t) => (
                            <MenuItem key={t} value={t}>{PublicationTypeLabels[t]}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Статус</InputLabel>
                        <Select
                          value={pubForm.status}
                          label="Статус"
                          onChange={(e) => setPubForm((p) => ({ ...p, status: e.target.value as PublicationStatus }))}
                        >
                          {(["DRAFT", "PENDING", "PRINT", "PUBLISHED", "REJECTED"] as PublicationStatus[]).map((s) => (
                            <MenuItem key={s} value={s}>{PublicationStatusLabels[s]}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <TextField
                      label="Год"
                      size="small"
                      type="number"
                      value={pubForm.year ?? ""}
                      onChange={(e) => setPubForm((p) => ({ ...p, year: e.target.value ? Number(e.target.value) : null }))}
                      slotProps={{ htmlInput: { min: 1900, max: 2100 } }}
                    />
                    {indexingSystems.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ color: "#6B778C", fontWeight: 600, mb: 0.5, display: "block" }}>
                          Индексирование
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                          {indexingSystems.map((sys) => {
                            const selected = (pubForm.index_ids ?? []).includes(sys.id);
                            return (
                              <Chip
                                key={sys.id}
                                label={sys.name}
                                size="small"
                                clickable
                                onClick={() =>
                                  setPubForm((p) => ({
                                    ...p,
                                    index_ids: selected
                                      ? (p.index_ids ?? []).filter((id) => id !== sys.id)
                                      : [...(p.index_ids ?? []), sys.id],
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
                  </DialogContent>
                  <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setPubDialogOpen(false)}>Отмена</Button>
                    <Button
                      variant="contained"
                      disabled={!pubForm.title || createPubMut.isPending || updatePubMut.isPending}
                      onClick={() => editingPubId ? updatePubMut.mutate(pubForm) : createPubMut.mutate(pubForm)}
                      sx={{ textTransform: "none", bgcolor: "#0052CC", "&:hover": { bgcolor: "#0747A6" } }}
                    >
                      {editingPubId ? "Сохранить" : "Добавить"}
                    </Button>
                  </DialogActions>
                </Dialog>
              </>
            )}

            {/* ─── Submissions (FILE tasks) ─── */}
            {panel.type === "task" && !isPublicationTask && (
              <>
                <Divider sx={{ mt: 0.5 }} />
                <Typography variant="subtitle2" fontWeight={700} color="#172B4D">
                  Ответы студента
                </Typography>

                {subsLoading ? (
                  <CircularProgress size={18} sx={{ alignSelf: "center" }} />
                ) : submissions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Ответов пока нет
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {submissions.map((sub: TaskSubmission) => {
                      const sc =
                        SubmissionStatusColors[sub.status] ?? {
                          bg: "#F4F5F7",
                          color: "#42526E",
                        };
                      return (
                        <Box
                          key={sub.id}
                          sx={{
                            border: "1px solid #DFE1E6",
                            borderRadius: 1.5,
                            p: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              mb: 0.5,
                            }}
                          >
                            <SChip
                              label={
                                SubmissionStatusLabels[sub.status] ?? sub.status
                              }
                              bg={sc.bg}
                              color={sc.color}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(sub.created_at).toLocaleDateString(
                                "ru-RU"
                              )}
                            </Typography>
                          </Box>
                          {sub.text && (
                            <Typography
                              variant="body2"
                              color="#42526E"
                              sx={{ mb: 0.8, fontSize: 12 }}
                            >
                              {sub.text}
                            </Typography>
                          )}
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="Скачать файл">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  downloadFile(projectId, stageIdForSub, taskIdForSub, sub.id, "download")
                                }
                              >
                                <Download sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            {sub.report && (
                              <Tooltip title="Скачать отчёт PDF">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    downloadFile(projectId, stageIdForSub, taskIdForSub, sub.id, "download_report")
                                  }
                                >
                                  <Description sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {isSupervisor && !reviewsBySubId[sub.id] && reviewingSubId !== sub.id && (
                              <Tooltip title="Оставить рецензию">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setReviewingSubId(sub.id);
                                    setEditingReviewId(null);
                                    setReviewDecision("APPROVED");
                                    setReviewComment("");
                                  }}
                                  sx={{ color: "#0052CC" }}
                                >
                                  <RateReview sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {isSupervisor && reviewsBySubId[sub.id] && editingReviewId !== reviewsBySubId[sub.id]!.id && (
                              <Tooltip title="Изменить рецензию">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const rev = reviewsBySubId[sub.id]!;
                                    setEditingReviewId(rev.id);
                                    setReviewingSubId(sub.id);
                                    setReviewDecision(rev.decision);
                                    setReviewComment(rev.comment);
                                  }}
                                  sx={{ color: "#42526E" }}
                                >
                                  <Edit sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>

                          {/* Existing review */}
                          {reviewsBySubId[sub.id] && editingReviewId !== reviewsBySubId[sub.id]!.id && (() => {
                            const rev = reviewsBySubId[sub.id]!;
                            const rc = ReviewDecisionColors[rev.decision];
                            return (
                              <Box sx={{ mt: 1, p: 1, borderRadius: 1, bgcolor: rc.bg }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.3 }}>
                                  <RateReview sx={{ fontSize: 13, color: rc.color }} />
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: rc.color }}>
                                    {ReviewDecisionLabels[rev.decision]}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "#97A0AF", ml: "auto" }}>
                                    {rev.reviewer.last_name} {rev.reviewer.first_name}
                                  </Typography>
                                </Box>
                                {rev.comment && (
                                  <Typography variant="caption" sx={{ color: "#42526E", display: "block" }}>
                                    {rev.comment}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })()}

                          {/* Review form */}
                          {isSupervisor && reviewingSubId === sub.id && (
                            <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: "#172B4D" }}>
                                {editingReviewId ? "Изменить рецензию" : "Рецензия"}
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1 }}>
                                {(["APPROVED", "NEEDS_REVISION"] as ReviewDecision[]).map((d) => (
                                  <Box
                                    key={d}
                                    onClick={() => setReviewDecision(d)}
                                    sx={{
                                      flex: 1, p: 0.8, borderRadius: 1, cursor: "pointer",
                                      border: "1.5px solid",
                                      borderColor: reviewDecision === d ? ReviewDecisionColors[d].color : "#DFE1E6",
                                      bgcolor: reviewDecision === d ? ReviewDecisionColors[d].bg : "#fff",
                                      display: "flex", alignItems: "center", gap: 0.5,
                                    }}
                                  >
                                    {d === "APPROVED"
                                      ? <CheckCircle sx={{ fontSize: 13, color: reviewDecision === d ? ReviewDecisionColors[d].color : "#97A0AF" }} />
                                      : <Cancel sx={{ fontSize: 13, color: reviewDecision === d ? ReviewDecisionColors[d].color : "#97A0AF" }} />
                                    }
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: reviewDecision === d ? ReviewDecisionColors[d].color : "#6B778C" }}>
                                      {ReviewDecisionLabels[d]}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                              <TextField
                                size="small"
                                label="Комментарий"
                                multiline
                                rows={2}
                                fullWidth
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                              />
                              <Box sx={{ display: "flex", gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={createReviewMut.isPending || updateReviewMut.isPending}
                                  onClick={() => {
                                    const data = { decision: reviewDecision, comment: reviewComment };
                                    if (editingReviewId) {
                                      updateReviewMut.mutate({ subId: sub.id, reviewId: editingReviewId, data });
                                    } else {
                                      createReviewMut.mutate({ subId: sub.id, data });
                                    }
                                  }}
                                  sx={{ textTransform: "none", bgcolor: "#0052CC", "&:hover": { bgcolor: "#0747A6" } }}
                                >
                                  {editingReviewId ? "Сохранить" : "Отправить"}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => { setReviewingSubId(null); setEditingReviewId(null); }}
                                  sx={{ textTransform: "none" }}
                                >
                                  Отмена
                                </Button>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* Create submission form (student) */}
                {isStudent &&
                  !submissions.some((s) => s.status === "APPROVED") && (
                    <>
                      <Divider />
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        color="#172B4D"
                      >
                        Отправить ответ
                      </Typography>
                      <TextField
                        label="Комментарий (необязательно)"
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        value={subText}
                        onChange={(e) => setSubText(e.target.value)}
                      />
                      <Box>
                        <input
                          type="file"
                          ref={fileRef}
                          style={{ display: "none" }}
                          onChange={(e) =>
                            setSubFile(e.target.files?.[0] ?? null)
                          }
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AttachFile />}
                          onClick={() => fileRef.current?.click()}
                          sx={{
                            textTransform: "none",
                            borderColor: "#DFE1E6",
                            color: "#42526E",
                            mb: 1,
                            display: "block",
                          }}
                        >
                          {subFile ? subFile.name : "Прикрепить файл *"}
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Send />}
                          onClick={() => {
                            if (!subFile) return;
                            const fd = new FormData();
                            fd.append("text", subText);
                            fd.append("file", subFile);
                            createSubMut.mutate(fd);
                          }}
                          disabled={!subFile || createSubMut.isPending}
                          sx={{
                            textTransform: "none",
                            bgcolor: "#0052CC",
                            "&:hover": { bgcolor: "#0747A6" },
                          }}
                        >
                          {createSubMut.isPending ? "Отправка..." : "Отправить"}
                        </Button>
                      </Box>
                    </>
                  )}
              </>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

// ─────────────────────────────────────────────
// STAGE REPORT ICON BUTTON
// ─────────────────────────────────────────────
function StageReportIconButton({
  projectId,
  stageId,
}: {
  projectId: number;
  stageId: number;
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await downloadStageReport(projectId, stageId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title="Скачать отчёт этапа (.docx)">
      <span>
        <IconButton size="small" onClick={handleDownload} disabled={loading}>
          {loading ? (
            <CircularProgress size={16} />
          ) : (
            <FileDownload sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}
