import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  LinearProgress,
  Skeleton,
  Alert,
  Divider,
} from "@mui/material";
import {
  ArrowBack,
  CheckCircle,
  HourglassEmpty,
  PlaylistAddCheck,
  Warning,
  Schedule,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { getProjectStats, getProject } from "../api/projects";
import {
  TaskStatusLabels,
  TaskStatusColors,
  type StatTask,
  type TaskStatus,
} from "../types";

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function MiniStat({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bg: string;
}) {
  return (
    <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2, height: "100%" }}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ bgcolor: bg, borderRadius: 2, p: 1, display: "flex", flexShrink: 0 }}>{icon}</Box>
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#172B4D" }}>
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function TaskRow({ task }: { task: StatTask }) {
  const c = TaskStatusColors[task.status as TaskStatus] ?? { bg: "#F4F5F7", color: "#42526E" };
  return (
    <Box sx={{ py: 1, display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ color: "#172B4D", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {task.title}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {task.stage_name}
        </Typography>
      </Box>
      <Chip
        label={TaskStatusLabels[task.status as TaskStatus] ?? task.status}
        size="small"
        sx={{ bgcolor: c.bg, color: c.color, fontWeight: 600, fontSize: 10, height: 20 }}
      />
      <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 86, textAlign: "right" }}>
        {fmtDate(task.deadline)}
      </Typography>
    </Box>
  );
}

export default function ProjectStatsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: () => getProjectStats(projectId),
  });

  usePageTitle(project ? `Статистика — ${project.title}` : "Статистика проекта");

  if (isError) {
    return <Alert severity="error">Не удалось загрузить статистику проекта</Alert>;
  }

  const studentName =
    project?.enrollment?.student?.full_name?.trim() ||
    project?.enrollment?.student?.username ||
    "";

  const progress = stats?.progress;
  const pct = progress?.completion_percent ?? 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/projects/${projectId}`)}
          sx={{ textTransform: "none", color: "#42526E" }}
        >
          К проекту
        </Button>
        <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: "#172B4D", fontSize: { xs: "1.15rem", sm: "1.5rem" } }}
          >
            {project?.title ?? "Статистика проекта"}
          </Typography>
          {studentName && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {studentName}
            </Typography>
          )}
        </Box>
      </Box>

      {isLoading || !stats ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 6, sm: 3 }}>
              <Skeleton height={84} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
          <Grid size={12}>
            <Skeleton height={320} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      ) : (
        <>
          {/* Stat cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MiniStat
                icon={<CheckCircle sx={{ color: "#00875A", fontSize: 24 }} />}
                label="Выполнено"
                value={progress?.done ?? 0}
                bg="#E3FCEF"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MiniStat
                icon={<HourglassEmpty sx={{ color: "#FF8B00", fontSize: 24 }} />}
                label="В работе"
                value={progress?.in_progress ?? 0}
                bg="#FFF0B3"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MiniStat
                icon={<PlaylistAddCheck sx={{ color: "#0052CC", fontSize: 24 }} />}
                label="Не начато"
                value={progress?.todo ?? 0}
                bg="#DEEBFF"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MiniStat
                icon={<Warning sx={{ color: "#DE350B", fontSize: 24 }} />}
                label="Просрочено"
                value={progress?.overdue ?? 0}
                bg="#FFEBE6"
              />
            </Grid>
          </Grid>

          {/* Progress bar */}
          <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2, mb: 3 }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#172B4D" }}>
                  Прогресс выполнения
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: pct === 100 ? "#006644" : "#42526E" }}>
                  {pct}% · {progress?.done ?? 0}/{progress?.total ?? 0}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: "#F4F5F7",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: pct === 100 ? "#36B37E" : pct >= 50 ? "#FF8B00" : "#0052CC",
                    borderRadius: 5,
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Burndown chart */}
          <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2, mb: 3 }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#172B4D", mb: 1 }}>
                Burndown — остаток задач во времени
              </Typography>
              {stats.burndown.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary", py: 4, textAlign: "center" }}>
                  Недостаточно данных для построения диаграммы
                </Typography>
              ) : (
                <Box sx={{ width: "100%", overflowX: "auto" }}>
                <LineChart
                  height={300}
                  width={Math.max(320, stats.burndown.length * 28)}
                  xAxis={[
                    {
                      scaleType: "point",
                      data: stats.burndown.map((p) => fmtShort(p.date)),
                    },
                  ]}
                  series={[
                    {
                      data: stats.burndown.map((p) => p.ideal_remaining),
                      label: "План (остаток)",
                      color: "#97A0AF",
                      showMark: false,
                    },
                    {
                      data: stats.burndown.map((p) => p.actual_remaining),
                      label: "Факт (остаток)",
                      color: "#0052CC",
                      showMark: false,
                    },
                  ]}
                />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Task lists */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2, height: "100%" }}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Schedule sx={{ color: "#0052CC", fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#172B4D" }}>
                      Ближайшие задачи
                    </Typography>
                  </Box>
                  {stats.upcoming_tasks.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                      Нет предстоящих задач
                    </Typography>
                  ) : (
                    stats.upcoming_tasks.map((t, i) => (
                      <Box key={t.id}>
                        {i > 0 && <Divider />}
                        <TaskRow task={t} />
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2, height: "100%" }}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Warning sx={{ color: "#DE350B", fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#172B4D" }}>
                      Просроченные задачи
                    </Typography>
                    {stats.overdue_tasks.length > 0 && (
                      <Chip
                        label={stats.overdue_tasks.length}
                        size="small"
                        sx={{ bgcolor: "#FFEBE6", color: "#BF2600", fontWeight: 700, height: 20, fontSize: 11, ml: "auto" }}
                      />
                    )}
                  </Box>
                  {stats.overdue_tasks.length === 0 ? (
                    <Box sx={{ py: 2, textAlign: "center" }}>
                      <CheckCircle sx={{ color: "#36B37E", fontSize: 28, mb: 0.5 }} />
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Просроченных задач нет
                      </Typography>
                    </Box>
                  ) : (
                    stats.overdue_tasks.map((t, i) => (
                      <Box key={t.id}>
                        {i > 0 && <Divider />}
                        <TaskRow task={t} />
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
