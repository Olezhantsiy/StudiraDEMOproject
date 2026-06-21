import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import { Search, OpenInNew, FilterList, Add, InsightsOutlined } from "@mui/icons-material";
import { getProjects } from "../api/projects";
import {
  ProjectStatusLabels,
  ProjectStatusColors,
  DegreeLevelLabels,
  DegreeLevelColors,
  EnrollmentStatusLabels,
  EnrollmentStatusColors,
  type ProjectStatus,
  type DegreeLevel,
  type EnrollmentStatus,
} from "../types";
import { useAuth } from "../contexts/AuthContext";

const STATUS_OPTIONS: { value: ProjectStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Все статусы" },
  { value: "DRAFT", label: "Черновик" },
  { value: "APPROVED", label: "Утверждён" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "PRE_DEFENSE", label: "Предзащита" },
  { value: "DEFENDED", label: "Защищён" },
  { value: "REJECTED", label: "Отклонён" },
];

function StatusChip({ status }: { status: ProjectStatus }) {
  const color = ProjectStatusColors[status] ?? {
    bg: "#F4F5F7",
    color: "#42526E",
  };
  return (
    <Chip
      label={ProjectStatusLabels[status] ?? status}
      size="small"
      sx={{
        bgcolor: color.bg,
        color: color.color,
        fontWeight: 600,
        fontSize: 11,
        height: 22,
      }}
    />
  );
}

function StudentAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <Avatar
      sx={{
        width: 28,
        height: 28,
        bgcolor: "#DEEBFF",
        color: "#0747A6",
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </Avatar>
  );
}

export default function ProjectsPage() {
  usePageTitle("Проекты");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">(
    "ALL"
  );

  const {
    data: projects = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const filtered = projects.filter((p) => {
    const studentName =
      p.enrollment?.student?.full_name ??
      p.enrollment?.student?.username ??
      "";
    const matchSearch =
      search === "" ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      studentName.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "ALL" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pageTitle =
    user?.role === "STD"
      ? "Мои проекты"
      : user?.role === "SPV"
      ? "Проекты моих студентов"
      : "Все проекты кафедры";

  const isStudent = user?.role === "STD";
  const showSupervisorColumn = user?.role === "HOD";

  if (isError) {
    return (
      <Alert severity="error">
        Не удалось загрузить проекты. Проверьте подключение к серверу.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="#172B4D" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
            {pageTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {isLoading
              ? "Загрузка..."
              : `${filtered.length} из ${projects.length} проектов`}
          </Typography>
        </Box>

        {(user?.role === "SPV" || user?.role === "HOD") && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate("/projects/new")}
            sx={{
              textTransform: "none",
              bgcolor: "#0052CC",
              "&:hover": { bgcolor: "#0747A6" },
            }}
          >
            Создать проект
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card
        elevation={0}
        sx={{ border: "1px solid #DFE1E6", borderRadius: 2, mb: 2 }}
      >
        <CardContent
          sx={{
            py: 1.5,
            px: 2,
            "&:last-child": { pb: 1.5 },
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <FilterList sx={{ color: "#8993A4", fontSize: 18 }} />

          <TextField
            placeholder="Поиск по названию или студенту..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: "#8993A4" }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { xs: "100%", sm: 280 }, flex: { xs: "1 1 100%", sm: "0 1 auto" } }}
          />

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 180 }, flex: { xs: "1 1 100%", sm: "0 1 auto" } }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={statusFilter}
              label="Статус"
              onChange={(e) =>
                setStatusFilter(e.target.value as ProjectStatus | "ALL")
              }
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Table */}
      <Card
        elevation={0}
        sx={{ border: "1px solid #DFE1E6", borderRadius: 2 }}
      >
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{ "& th": { bgcolor: "#F8F9FA", fontWeight: 600 } }}
              >
                <TableCell sx={{ color: "#5E6C84", fontSize: 12, py: 1.5 }}>
                  {isStudent ? "РУКОВОДИТЕЛЬ" : "СТУДЕНТ"}
                </TableCell>
                <TableCell sx={{ color: "#5E6C84", fontSize: 12, py: 1.5 }}>
                  ТЕМА ПРОЕКТА
                </TableCell>
                <TableCell sx={{ color: "#5E6C84", fontSize: 12, py: 1.5 }}>
                  СТАТУС
                </TableCell>
                {showSupervisorColumn && (
                  <TableCell
                    sx={{ color: "#5E6C84", fontSize: 12, py: 1.5 }}
                  >
                    РУКОВОДИТЕЛЬ
                  </TableCell>
                )}
                <TableCell
                  sx={{ color: "#5E6C84", fontSize: 12, py: 1.5 }}
                  align="right"
                >
                  ДАТА НАЧАЛА
                </TableCell>
                <TableCell sx={{ py: 1.5 }} width={88} />
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Skeleton variant="circular" width={28} height={28} />
                          <Skeleton width={120} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Skeleton width={240} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={80} height={22} />
                      </TableCell>
                      {showSupervisorColumn && (
                        <TableCell>
                          <Skeleton width={120} />
                        </TableCell>
                      )}
                      <TableCell align="right">
                        <Skeleton width={80} />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                : filtered.map((project) => {
                    const studentName =
                      project.enrollment?.student?.full_name?.trim() ||
                      project.enrollment?.student?.username ||
                      "—";
                    const supervisorName =
                      project.supervisor?.full_name?.trim() ||
                      project.supervisor?.username ||
                      "—";
                    const startDate = project.start_date
                      ? new Date(project.start_date).toLocaleDateString(
                          "ru-RU",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )
                      : "—";

                    return (
                      <TableRow
                        key={project.id}
                        hover
                        sx={{
                          cursor: "pointer",
                          "&:hover": { bgcolor: "#F8F9FA" },
                          "& td": { borderBottom: "1px solid #F4F5F7" },
                        }}
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        {/* Student / Supervisor */}
                        <TableCell sx={{ py: 1.5 }}>
                          {isStudent ? (
                            /* Student sees supervisor */
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <StudentAvatar name={supervisorName} />
                              <Typography
                                variant="body2"
                                fontWeight={500}
                                color="#172B4D"
                                noWrap
                                sx={{ maxWidth: 180 }}
                              >
                                {supervisorName}
                              </Typography>
                            </Box>
                          ) : (
                            /* SPV / HOD see student with degree + enrollment chips */
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <StudentAvatar name={studentName} />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={500}
                                  color="#172B4D"
                                  noWrap
                                  sx={{ maxWidth: 180 }}
                                >
                                  {studentName}
                                </Typography>
                                <Box sx={{ display: "flex", gap: 0.5, mt: 0.4, flexWrap: "wrap" }}>
                                  {(() => {
                                    const dl = project.enrollment?.group?.program?.degree_level as DegreeLevel | undefined;
                                    const es = project.enrollment?.status as EnrollmentStatus | undefined;
                                    const dlColor = dl ? DegreeLevelColors[dl] : null;
                                    const esColor = es ? EnrollmentStatusColors[es] : null;
                                    return (
                                      <>
                                        {dl && dlColor && (
                                          <Chip
                                            label={DegreeLevelLabels[dl]}
                                            size="small"
                                            sx={{ height: 18, fontSize: 10, fontWeight: 600, bgcolor: dlColor.bg, color: dlColor.color }}
                                          />
                                        )}
                                        {es && esColor && (
                                          <Chip
                                            label={EnrollmentStatusLabels[es]}
                                            size="small"
                                            sx={{ height: 18, fontSize: 10, fontWeight: 600, bgcolor: esColor.bg, color: esColor.color }}
                                          />
                                        )}
                                      </>
                                    );
                                  })()}
                                </Box>
                              </Box>
                            </Box>
                          )}
                        </TableCell>

                        {/* Title */}
                        <TableCell sx={{ py: 1.5, maxWidth: 320 }}>
                          <Tooltip title={project.title} placement="top">
                            <Typography
                              variant="body2"
                              color="#172B4D"
                              noWrap
                              sx={{ maxWidth: 300 }}
                            >
                              {project.title}
                            </Typography>
                          </Tooltip>
                          {project.keywords && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{ display: "block", maxWidth: 300 }}
                            >
                              {project.keywords}
                            </Typography>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell sx={{ py: 1.5 }}>
                          <StatusChip status={project.status} />
                        </TableCell>

                        {/* Supervisor (HOD only) */}
                        {showSupervisorColumn && (
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography
                              variant="body2"
                              color="#42526E"
                              noWrap
                              sx={{ maxWidth: 160 }}
                            >
                              {supervisorName}
                            </Typography>
                          </TableCell>
                        )}

                        {/* Start date */}
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <Typography
                            variant="body2"
                            color="#8993A4"
                            whiteSpace="nowrap"
                          >
                            {startDate}
                          </Typography>
                        </TableCell>

                        {/* Action icons */}
                        <TableCell sx={{ py: 1.5 }} align="right">
                          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                            <Tooltip title="Статистика проекта">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/projects/${project.id}/stats`);
                                }}
                              >
                                <InsightsOutlined sx={{ fontSize: 16, color: "#0052CC" }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Открыть проект">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/projects/${project.id}`);
                                }}
                              >
                                <OpenInNew sx={{ fontSize: 16, color: "#8993A4" }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}

              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={showSupervisorColumn ? 6 : 5}
                    align="center"
                    sx={{ py: 6 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {projects.length === 0
                        ? "Проектов пока нет"
                        : "Ничего не найдено по заданным фильтрам"}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
