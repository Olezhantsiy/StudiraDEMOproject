import { useMemo } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  Skeleton,
  Divider,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  FolderOpen,
  Person,
  Assignment,
  CheckCircle,
  HourglassEmpty,
  Warning,
  Groups,
  InsightsOutlined,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { getProjects, getProjectDashboardStats, getDepartmentSummary } from "../api/projects";
import { SupervisorStatsView } from "./SupervisorStatsPage";
import {
  RoleLabels,
  ProjectStatusColors,
  ProjectStatusLabels,
  type ProjectStatus,
  type ProjectTaskStats,
} from "../types";

// ─── helpers ────────────────────────────────────────────────

function userInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

/** «Фамилия И. О.» из full_name (порядок: фамилия, имя, отчество). */
function personShortName(
  person?: { full_name?: string; username?: string } | null
): string {
  if (!person) return "—";
  const full = person.full_name?.trim();
  if (!full) return person.username || "—";
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? person.username ?? "—";
  const [last, first, middle] = parts;
  return [
    last,
    first ? `${first[0]}.` : "",
    middle ? `${middle[0]}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusChip({ status }: { status: ProjectStatus }) {
  const c = ProjectStatusColors[status] ?? { bg: "#F4F5F7", color: "#42526E" };
  return (
    <Chip
      label={ProjectStatusLabels[status] ?? status}
      size="small"
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 600, fontSize: 11, height: 20 }}
    />
  );
}

// ─── stat card ──────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  bg,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bg: string;
  loading?: boolean;
}) {
  return (
    <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2, height: "100%" }}>
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: 2.5,
          "&:last-child": { pb: 2.5 },
        }}
      >
        <Box sx={{ bgcolor: bg, borderRadius: 2, p: 1.2, display: "flex", flexShrink: 0 }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {label}
          </Typography>
          {loading ? (
            <Skeleton width={40} height={28} />
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#172B4D" }}>
              {value}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── donut chart (SVG, без зависимостей) ────────────────────

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

function DonutChart({ segments, total }: { segments: DonutSegment[]; total: number }) {
  const r = 52;
  const sw = 20; // strokeWidth
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 140 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Задач пока нет
        </Typography>
      </Box>
    );
  }

  // Считаем начало каждого сегмента (длина дуги)
  let startLen = 0;
  const segs = segments.map((seg) => {
    const segLen = (seg.value / total) * circumference;
    const s = { ...seg, segLen, startLen };
    startLen += segLen;
    return s;
  });

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "center", sm: "center" }, gap: 2 }}>
      <Box sx={{ flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* фон */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F4F5F7" strokeWidth={sw} />

          {/* сегменты */}
          {segs.filter((s) => s.value > 0).map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={sw}
              // stroke-dasharray: рисуем segLen, затем пробел на весь оставшийся периметр
              strokeDasharray={`${s.segLen} ${circumference}`}
              // отрицательный dashoffset = сдвигаем начало дуги по часовой стрелке
              strokeDashoffset={-s.startLen}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          ))}

          {/* текст в центре */}
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize="22" fontWeight="700" fill="#172B4D">
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#6B778C">
            задач
          </text>
        </svg>
      </Box>

      {/* легенда */}
      <Box sx={{ flex: 1 }}>
        {segments.map((seg, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.7 }}>
            <Box
              sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: seg.color, flexShrink: 0 }}
            />
            <Typography variant="caption" sx={{ color: "#42526E", flex: 1 }}>
              {seg.label}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#172B4D" }}>
              {seg.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── student dashboard ──────────────────────────────────────

function StudentDashboard() {
  usePageTitle("Главная");
  const { user } = useAuth();
  const navigate = useNavigate();
  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username
    : "";

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#172B4D" }}>
          Добро пожаловать, {fullName}!
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {user?.role ? RoleLabels[user.role] : ""}
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            icon={<FolderOpen sx={{ color: "#0052CC", fontSize: 28 }} />}
            label="Мои проекты"
            value={projects.length}
            bg="#DEEBFF"
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            icon={<CheckCircle sx={{ color: "#00875A", fontSize: 28 }} />}
            label="Активных"
            value={projects.filter((p) => p.status === "IN_PROGRESS").length}
            bg="#E3FCEF"
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            icon={<HourglassEmpty sx={{ color: "#FF8B00", fontSize: 28 }} />}
            label="Черновиков"
            value={projects.filter((p) => p.status === "DRAFT").length}
            bg="#FFF0B3"
            loading={isLoading}
          />
        </Grid>
      </Grid>

      {!isLoading && projects.length > 0 && (
        <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2 }}>
          <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#172B4D", mb: 2 }}>
              Мои проекты
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {projects.map((p) => (
                <Box
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "#F4F5F7" },
                  }}
                >
                  <FolderOpen sx={{ color: "#5E6C84", fontSize: 18, flexShrink: 0 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#172B4D",
                      fontWeight: 500,
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.title}
                  </Typography>
                  <StatusChip status={p.status} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// ─── supervisor / HOD dashboard ─────────────────────────────

function SupervisorDashboard() {
  usePageTitle("Главная");
  const { user } = useAuth();
  const navigate = useNavigate();
  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username
    : "";

  const { data: allProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const isHOD = user?.role === "HOD";

  // HOD sees all department projects; SPV sees only projects they supervise
  const projects = useMemo(
    () => isHOD ? allProjects : allProjects.filter((p) => p.supervisor?.id === user?.id),
    [allProjects, user?.id, isHOD]
  );

  const { data: statsArr = [], isLoading: statsLoading } = useQuery({
    queryKey: ["projects", "dashboard-stats"],
    queryFn: getProjectDashboardStats,
  });

  // Keep stats only for projects visible on the dashboard
  const ownProjectIds = useMemo(
    () => new Set(projects.map((p) => p.id)),
    [projects]
  );

  const ownStatsArr = useMemo(
    () => statsArr.filter((s) => ownProjectIds.has(s.project_id)),
    [statsArr, ownProjectIds]
  );

  // Карта статистики задач по project_id
  const statsMap = useMemo(() => {
    const m: Record<number, ProjectTaskStats> = {};
    ownStatsArr.forEach((s) => { m[s.project_id] = s; });
    return m;
  }, [ownStatsArr]);

  const uniqueStudents = useMemo(() => {
    const ids = new Set(
      projects.map((p) => p.enrollment?.student?.id).filter(Boolean)
    );
    return ids.size;
  }, [projects]);

  const activeProjects = useMemo(
    () =>
      [...projects]
        .filter((p) => p.status === "IN_PROGRESS" || p.status === "APPROVED")
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
        .slice(0, 3),
    [projects]
  );

  // Суммарная статистика по задачам (для диаграммы)
  const totalTaskStats = useMemo(() => {
    const acc = { done: 0, in_progress: 0, todo: 0, overdue: 0 };
    ownStatsArr.forEach((s) => {
      acc.done += s.done;
      acc.in_progress += s.in_progress;
      acc.todo += s.todo;
      acc.overdue += s.overdue;
    });
    return acc;
  }, [ownStatsArr]);

  const totalTasks =
    totalTaskStats.done + totalTaskStats.in_progress + totalTaskStats.todo + totalTaskStats.overdue;

  const totalOverdueTasks = useMemo(
    () => ownStatsArr.reduce((s, p) => s + p.overdue, 0),
    [ownStatsArr]
  );

  const loading = projectsLoading || statsLoading;

  const donutSegments = [
    { value: totalTaskStats.done, color: "#36B37E", label: "Выполнено" },
    { value: totalTaskStats.in_progress, color: "#FF8B00", label: "В работе" },
    { value: totalTaskStats.todo, color: "#DFE1E6", label: "Не начато" },
    { value: totalTaskStats.overdue, color: "#DE350B", label: "Просрочено" },
  ];

  return (
    <Box>
      {/* ── Заголовок ── */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#172B4D" }}>
          Добро пожаловать, {fullName}!
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {user?.role ? RoleLabels[user.role] : ""}
        </Typography>
      </Box>

      {/* ── Карточки статистики ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            icon={<FolderOpen sx={{ color: "#0052CC", fontSize: 26 }} />}
            label="Всего проектов"
            value={projects.length}
            bg="#DEEBFF"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            icon={<Person sx={{ color: "#00875A", fontSize: 26 }} />}
            label={isHOD ? "Студентов" : "Прикреплено студентов"}
            value={uniqueStudents}
            bg="#E3FCEF"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            icon={<Assignment sx={{ color: "#FF8B00", fontSize: 26 }} />}
            label="Активных проектов"
            value={projects.filter((p) => p.status === "IN_PROGRESS").length}
            bg="#FFF0B3"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            icon={<Warning sx={{ color: "#DE350B", fontSize: 26 }} />}
            label="Просрочено задач"
            value={totalOverdueTasks}
            bg="#FFEBE6"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* ── Активные проекты + Диаграмма ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Активные проекты с прогрессом */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2, height: "100%" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#172B4D" }}>
                  Активные проекты
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#0052CC",
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                  onClick={() => navigate("/projects")}
                >
                  Все проекты →
                </Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height={62} sx={{ borderRadius: 1 }} />
                  ))}
                </Box>
              ) : activeProjects.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", py: 3, textAlign: "center" }}
                >
                  Нет активных проектов
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  {activeProjects.map((p, idx) => {
                    const studentShort = personShortName(p.enrollment?.student);
                    const supervisorShort = personShortName(p.supervisor);
                    const avatarName =
                      p.enrollment?.student?.full_name?.trim() ||
                      p.enrollment?.student?.username ||
                      "—";
                    const stats = statsMap[p.id];
                    const pct = stats?.completion_percent ?? 0;
                    return (
                      <Box key={p.id}>
                        <Box
                          onClick={() => navigate(`/projects/${p.id}`)}
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1.5,
                            py: 1.2,
                            px: 1,
                            borderRadius: 1.5,
                            cursor: "pointer",
                            "&:hover": { bgcolor: "#F4F5F7" },
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: "#DEEBFF",
                              color: "#0747A6",
                              fontSize: 12,
                              fontWeight: 700,
                              flexShrink: 0,
                              mt: 0.3,
                            }}
                          >
                            {userInitials(avatarName)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: "#172B4D",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                              >
                                {p.title}
                              </Typography>
                              <StatusChip status={p.status} />
                            </Box>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {studentShort} · {supervisorShort} · начало {fmtDate(p.start_date)}
                            </Typography>
                            {/* Прогресс готовности */}
                            <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                sx={{
                                  flex: 1,
                                  height: 5,
                                  borderRadius: 3,
                                  bgcolor: "#F4F5F7",
                                  "& .MuiLinearProgress-bar": {
                                    bgcolor: pct === 100
                                      ? "#36B37E"
                                      : pct >= 50
                                      ? "#FF8B00"
                                      : "#0052CC",
                                    borderRadius: 3,
                                  },
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  color: pct === 100 ? "#006644" : "#42526E",
                                  minWidth: 32,
                                  textAlign: "right",
                                }}
                              >
                                {pct}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        {idx < activeProjects.length - 1 && <Divider sx={{ my: 0.25 }} />}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Диаграмма статусов задач */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2, height: "100%" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#172B4D", mb: 2 }}>
                Состояние задач
              </Typography>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <Skeleton variant="circular" width={120} height={120} />
                </Box>
              ) : (
                <DonutChart segments={donutSegments} total={totalTasks} />
              )}
              {!loading && totalTasks > 0 && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #F4F5F7" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Общий процент готовности
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.round((totalTaskStats.done / totalTasks) * 100)}
                      sx={{
                        flex: 1,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: "#F4F5F7",
                        "& .MuiLinearProgress-bar": { bgcolor: "#36B37E", borderRadius: 4 },
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#006644", minWidth: 36 }}>
                      {Math.round((totalTaskStats.done / totalTasks) * 100)}%
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── HOD: сводка по руководителям ── */}
      {isHOD && (
        <Box sx={{ mt: 2 }}>
          <DepartmentSummarySection />
        </Box>
      )}

      {/* ── SPV: статистика по студентам ── */}
      {!isHOD && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Person sx={{ color: "#0052CC", fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#172B4D" }}>
              Статистика по студентам
            </Typography>
          </Box>
          <SupervisorStatsView showSummaryCards={false} />
        </Box>
      )}
    </Box>
  );
}

// ─── HOD: department summary (по руководителям) ──────────────

function DepartmentSummarySection() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ["department-summary"],
    queryFn: getDepartmentSummary,
  });

  return (
    <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2 }}>
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2.5, pb: 1.5 }}>
          <Groups sx={{ color: "#0052CC", fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#172B4D" }}>
            Сводка по научным руководителям
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ p: 2.5, pt: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={44} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : data.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", p: 2.5, pt: 0 }}>
            На кафедре нет руководителей с проектами
          </Typography>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { bgcolor: "#F8F9FA", color: "#5E6C84", fontSize: 12, fontWeight: 600 } }}>
                  <TableCell>РУКОВОДИТЕЛЬ</TableCell>
                  <TableCell align="center">СТУДЕНТОВ</TableCell>
                  <TableCell align="center">СРЕДНИЙ %</TableCell>
                  <TableCell align="center">ПРОСРОЧЕНО</TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => {
                  const supId = row.supervisor?.id;
                  const supName = row.supervisor?.full_name || "—";
                  return (
                    <TableRow
                      key={supId ?? supName}
                      hover
                      sx={{ cursor: supId ? "pointer" : "default", "& td": { borderBottom: "1px solid #F4F5F7" } }}
                      onClick={() => supId && navigate(`/supervisors/${supId}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#172B4D", fontWeight: 500 }}>
                          {supName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ color: "#42526E" }}>
                          {row.students_count}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${row.avg_completion_percent}%`}
                          size="small"
                          sx={{
                            bgcolor:
                              row.avg_completion_percent >= 70
                                ? "#E3FCEF"
                                : row.avg_completion_percent >= 40
                                ? "#FFF0B3"
                                : "#FFEBE6",
                            color:
                              row.avg_completion_percent >= 70
                                ? "#006644"
                                : row.avg_completion_percent >= 40
                                ? "#FF8B00"
                                : "#BF2600",
                            fontWeight: 700,
                            fontSize: 11,
                            height: 20,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {row.total_overdue_tasks > 0 ? (
                          <Chip
                            label={row.total_overdue_tasks}
                            size="small"
                            sx={{ bgcolor: "#FFEBE6", color: "#BF2600", fontWeight: 700, height: 20, fontSize: 11 }}
                          />
                        ) : (
                          <Typography variant="caption" sx={{ color: "#97A0AF" }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Подробная статистика">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!supId}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (supId) navigate(`/supervisors/${supId}`);
                              }}
                            >
                              <InsightsOutlined sx={{ fontSize: 16, color: "#0052CC" }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── root ────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === "SPV" || user?.role === "HOD") return <SupervisorDashboard />;
  return <StudentDashboard />;
}
