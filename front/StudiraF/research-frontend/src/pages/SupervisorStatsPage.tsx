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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Avatar,
} from "@mui/material";
import {
  ArrowBack,
  Person,
  TrendingUp,
  Warning,
  InsightsOutlined,
} from "@mui/icons-material";
import { getSupervisorSummary } from "../api/projects";
import {
  ProjectStatusLabels,
  ProjectStatusColors,
  type ProjectStatus,
} from "../types";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function MetricCard({
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
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ bgcolor: bg, borderRadius: 2, p: 1.2, display: "flex", flexShrink: 0 }}>{icon}</Box>
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

/**
 * Supervisor statistics. Set `showSummaryCards={false}` on the dashboard to
 * avoid duplicating metrics already shown elsewhere — only the student table.
 */
export function SupervisorStatsView({
  supervisorId,
  showSummaryCards = true,
}: {
  supervisorId?: number;
  showSummaryCards?: boolean;
}) {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["supervisor-summary", supervisorId ?? "self"],
    queryFn: () => getSupervisorSummary(supervisorId),
  });

  if (isError) {
    return <Alert severity="error">Не удалось загрузить статистику руководителя</Alert>;
  }

  return (
    <Box>
      {showSummaryCards && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              icon={<Person sx={{ color: "#00875A", fontSize: 26 }} />}
              label="Закреплено студентов"
              value={data?.students_count ?? 0}
              bg="#E3FCEF"
              loading={isLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              icon={<TrendingUp sx={{ color: "#0052CC", fontSize: 26 }} />}
              label="Средний % выполнения"
              value={`${data?.avg_completion_percent ?? 0}%`}
              bg="#DEEBFF"
              loading={isLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <MetricCard
              icon={<Warning sx={{ color: "#DE350B", fontSize: 26 }} />}
              label="Просрочено задач"
              value={data?.total_overdue_tasks ?? 0}
              bg="#FFEBE6"
              loading={isLoading}
            />
          </Grid>
        </Grid>
      )}

      <Card elevation={0} sx={{ border: "1px solid #DFE1E6", borderRadius: 2 }}>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#172B4D", p: 2.5, pb: 1.5 }}>
            Студенты
          </Typography>
          {isLoading ? (
            <Box sx={{ p: 2.5, pt: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={48} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          ) : !data || data.students.length === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary", p: 2.5, pt: 0 }}>
              Нет закреплённых студентов
            </Typography>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "#F8F9FA", color: "#5E6C84", fontSize: 12, fontWeight: 600 } }}>
                    <TableCell>СТУДЕНТ</TableCell>
                    <TableCell>ПРОЕКТ</TableCell>
                    <TableCell>СТАТУС</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>ПРОГРЕСС</TableCell>
                    <TableCell align="center">ПРОСРОЧЕНО</TableCell>
                    <TableCell width={48} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.students.map((row) => {
                    const sName = row.student?.full_name || "—";
                    const sc = ProjectStatusColors[row.status as ProjectStatus] ?? { bg: "#F4F5F7", color: "#42526E" };
                    return (
                      <TableRow
                        key={row.project_id}
                        hover
                        sx={{ cursor: "pointer", "& td": { borderBottom: "1px solid #F4F5F7" } }}
                        onClick={() => navigate(`/projects/${row.project_id}/stats`)}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar sx={{ width: 26, height: 26, bgcolor: "#DEEBFF", color: "#0747A6", fontSize: 11, fontWeight: 700 }}>
                              {initials(sName)}
                            </Avatar>
                            <Typography variant="body2" sx={{ color: "#172B4D" }} noWrap>
                              {sName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 240 }}>
                          <Typography variant="body2" sx={{ color: "#42526E" }} noWrap>
                            {row.project_title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ProjectStatusLabels[row.status as ProjectStatus] ?? row.status}
                            size="small"
                            sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: 10, height: 20 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={row.completion_percent}
                              sx={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: "#F4F5F7",
                                "& .MuiLinearProgress-bar": {
                                  bgcolor:
                                    row.completion_percent === 100
                                      ? "#36B37E"
                                      : row.completion_percent >= 50
                                      ? "#FF8B00"
                                      : "#0052CC",
                                  borderRadius: 3,
                                },
                              }}
                            />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "#42526E", minWidth: 32, textAlign: "right" }}>
                              {row.completion_percent}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {row.overdue > 0 ? (
                            <Chip
                              label={row.overdue}
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
                          <Tooltip title="Статистика проекта">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/projects/${row.project_id}/stats`);
                              }}
                            >
                              <InsightsOutlined sx={{ fontSize: 16, color: "#0052CC" }} />
                            </IconButton>
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
    </Box>
  );
}

export default function SupervisorStatsPage() {
  const { id } = useParams<{ id: string }>();
  const supervisorId = Number(id);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["supervisor-summary", supervisorId],
    queryFn: () => getSupervisorSummary(supervisorId),
  });

  const supName = data?.supervisor?.full_name || "Руководитель";
  usePageTitle(data ? `Статистика — ${supName}` : "Статистика руководителя");

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/")}
          sx={{ textTransform: "none", color: "#42526E" }}
        >
          К дашборду
        </Button>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#172B4D" }} noWrap>
            {supName}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Статистика научного руководителя
          </Typography>
        </Box>
      </Box>

      <SupervisorStatsView supervisorId={supervisorId} />
    </Box>
  );
}
