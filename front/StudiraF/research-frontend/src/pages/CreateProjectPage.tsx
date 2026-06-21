import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Card,
  CardContent,
  InputAdornment,
  CircularProgress,
  Alert,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
} from "@mui/material";
import {
  Search,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  AutoAwesome,
  EditNote,
  Person,
  Article,
  Lock,
} from "@mui/icons-material";
import { getEnrollments, createProject, type CreateProjectPayload } from "../api/projects";
import { generateTemplate } from "../api/stages";
import { getTemplates } from "../api/templates";
import type { StudentEnrollment, ProjectStatus, DegreeLevel, EnrollmentStatus } from "../types";
import {
  ProjectStatusLabels,
  DegreeLevelLabels,
  DegreeLevelColors,
  EnrollmentStatusLabels,
  EnrollmentStatusColors,
} from "../types";

const STEPS = ["Выбор студента", "Информация о проекте", "Выбор плана"];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "DRAFT", label: "Черновик" },
  { value: "APPROVED", label: "Утверждён" },
  { value: "IN_PROGRESS", label: "В работе" },
];

function StudentAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <Avatar
      sx={{
        width: 36,
        height: 36,
        bgcolor: "#DEEBFF",
        color: "#0747A6",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </Avatar>
  );
}

export default function CreateProjectPage() {
  usePageTitle("Создать проект");
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  // Step 1: student selection
  const [search, setSearch] = useState("");
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<StudentEnrollment | null>(null);

  // Step 2: project info
  const [form, setForm] = useState<Omit<CreateProjectPayload, "enrollment_id">>({
    title: "",
    description: "",
    keywords: "",
    start_date: new Date().toISOString().split("T")[0],
    status: "DRAFT",
  });

  // Step 3: plan type
  const [planType, setPlanType] = useState<"template" | "manual" | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Fetch enrollments
  const {
    data: enrollments = [],
    isLoading: enrollmentsLoading,
    isError: enrollmentsError,
  } = useQuery({
    queryKey: ["enrollments"],
    queryFn: getEnrollments,
  });

  // Fetch templates (step 3)
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["plan-templates"],
    queryFn: getTemplates,
    enabled: activeStep === 2,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return enrollments;
    const q = search.toLowerCase();
    return enrollments.filter((e) => {
      const name =
        e.student?.full_name?.toLowerCase() ?? e.student?.username?.toLowerCase() ?? "";
      const group = e.group?.name?.toLowerCase() ?? "";
      return name.includes(q) || group.includes(q);
    });
  }, [enrollments, search]);

  // Create project mutation
  const createMut = useMutation({
    mutationFn: createProject,
  });

  // Generate template mutation
  const templateMut = useMutation({
    mutationFn: ({ projectId, templateId }: { projectId: number; templateId?: number }) =>
      generateTemplate(projectId, templateId),
  });

  const handleFinish = async () => {
    if (!selectedEnrollment) return;

    const payload: CreateProjectPayload = {
      ...form,
      enrollment_id: selectedEnrollment.id,
    };

    const project = await createMut.mutateAsync(payload);

    if (planType === "template") {
      await templateMut.mutateAsync({ projectId: project.id, templateId: selectedTemplateId ?? undefined });
    }

    navigate(`/projects/${project.id}`);
  };

  const canNext =
    (activeStep === 0 && selectedEnrollment !== null) ||
    (activeStep === 1 && form.title.trim() !== "" && form.start_date !== "") ||
    (activeStep === 2 &&
      planType !== null &&
      (planType !== "template" || selectedTemplateId !== null));

  const isLastStep = activeStep === STEPS.length - 1;
  const isBusy = createMut.isPending || templateMut.isPending;

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/projects")}
          sx={{ textTransform: "none", color: "#42526E" }}
        >
          Назад
        </Button>
        <Divider orientation="vertical" flexItem />
        <Box>
          <Typography variant="h5" fontWeight={700} color="#172B4D">
            Создать проект
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Новый исследовательский проект
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      <Card
        elevation={0}
        sx={{ border: "1px solid #DFE1E6", borderRadius: 2, mb: 3 }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* ── Step 1: Select student ── */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color="#172B4D" mb={2}>
                Выберите студента
              </Typography>

              <TextField
                placeholder="Поиск по ФИО или группе..."
                size="small"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: "#8993A4" }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ mb: 2 }}
              />

              {enrollmentsLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : enrollmentsError ? (
                <Alert severity="error">
                  Не удалось загрузить список студентов
                </Alert>
              ) : filtered.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", py: 4 }}
                >
                  {enrollments.length === 0
                    ? "Нет доступных студентов"
                    : "Ничего не найдено"}
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    maxHeight: 360,
                    overflowY: "auto",
                  }}
                >
                  {filtered.map((enrollment) => {
                    const name =
                      enrollment.student?.full_name?.trim() ||
                      enrollment.student?.username ||
                      "—";
                    const groupName = enrollment.group?.name ?? "";
                    const isSelected = selectedEnrollment?.id === enrollment.id;

                    return (
                      <Box
                        key={enrollment.id}
                        onClick={() => setSelectedEnrollment(enrollment)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          px: 2,
                          py: 1.5,
                          borderRadius: 1.5,
                          border: "1.5px solid",
                          borderColor: isSelected ? "#0052CC" : "#DFE1E6",
                          bgcolor: isSelected ? "#DEEBFF" : "white",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          "&:hover": {
                            borderColor: "#0052CC",
                            bgcolor: isSelected ? "#DEEBFF" : "#F4F5F7",
                          },
                        }}
                      >
                        <StudentAvatar name={name} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="#172B4D"
                            noWrap
                          >
                            {name}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 0.5, mt: 0.4, flexWrap: "wrap", alignItems: "center" }}>
                            {groupName && (
                              <Typography variant="caption" color="text.secondary">
                                {groupName}
                              </Typography>
                            )}
                            {(() => {
                              const dl = enrollment.group?.program?.degree_level as DegreeLevel | undefined;
                              const es = enrollment.status as EnrollmentStatus | undefined;
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
                        {isSelected && (
                          <CheckCircle sx={{ color: "#0052CC", fontSize: 20 }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}

              {selectedEnrollment && (
                <Box
                  sx={{
                    mt: 2,
                    px: 2,
                    py: 1,
                    bgcolor: "#E3FCEF",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Person sx={{ color: "#006644", fontSize: 16 }} />
                  <Typography variant="body2" color="#006644" fontWeight={600}>
                    Выбран:{" "}
                    {selectedEnrollment.student?.full_name?.trim() ||
                      selectedEnrollment.student?.username}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* ── Step 2: Project info ── */}
          {activeStep === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} color="#172B4D">
                Информация о проекте
              </Typography>

              {selectedEnrollment && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 1,
                    bgcolor: "#F4F5F7",
                    borderRadius: 1,
                  }}
                >
                  <Person sx={{ fontSize: 16, color: "#5E6C84" }} />
                  <Typography variant="body2" color="#42526E">
                    Студент:{" "}
                    <strong>
                      {selectedEnrollment.student?.full_name?.trim() ||
                        selectedEnrollment.student?.username}
                    </strong>
                  </Typography>
                  {selectedEnrollment.group?.name && (
                    <Chip
                      label={selectedEnrollment.group.name}
                      size="small"
                      sx={{ ml: "auto", fontSize: 11 }}
                    />
                  )}
                </Box>
              )}

              <TextField
                label="Название проекта"
                size="small"
                fullWidth
                required
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Введите тему исследовательского проекта"
              />

              <TextField
                label="Описание"
                size="small"
                fullWidth
                multiline
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Краткое описание проекта и его целей"
              />

              <TextField
                label="Ключевые слова"
                size="small"
                fullWidth
                value={form.keywords}
                onChange={(e) =>
                  setForm((p) => ({ ...p, keywords: e.target.value }))
                }
                placeholder="Через запятую: машинное обучение, нейронные сети, ..."
              />

              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
                <TextField
                  label="Дата начала"
                  size="small"
                  type="date"
                  fullWidth
                  required
                  value={form.start_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, start_date: e.target.value }))
                  }
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { placeholder: "" },
                  }}
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>Статус</InputLabel>
                  <Select
                    value={form.status}
                    label="Статус"
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        status: e.target.value as ProjectStatus,
                      }))
                    }
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}

          {/* ── Step 3: Plan type ── */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color="#172B4D" mb={0.5}>
                Выбор плана работы
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Выберите, как будет сформирован план этапов проекта
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Template option */}
                <Box
                  onClick={() => setPlanType("template")}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: "1.5px solid",
                    borderColor: planType === "template" ? "#0052CC" : "#DFE1E6",
                    bgcolor: planType === "template" ? "#DEEBFF" : "white",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: "#0052CC",
                      bgcolor: planType === "template" ? "#DEEBFF" : "#F4F5F7",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                    <Box
                      sx={{
                        width: 44, height: 44, borderRadius: 2,
                        bgcolor: planType === "template" ? "#0052CC" : "#F4F5F7",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                    >
                      <AutoAwesome sx={{ color: planType === "template" ? "white" : "#5E6C84", fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Typography variant="body1" fontWeight={700} color="#172B4D">
                          Создать по шаблону
                        </Typography>
                        {planType === "template" && selectedTemplateId && (
                          <CheckCircle sx={{ color: "#0052CC", fontSize: 18 }} />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Выберите готовый шаблон. Этапы и задачи будут созданы автоматически — вы сможете отредактировать их позже.
                      </Typography>

                      {/* Template list */}
                      {planType === "template" && (
                        <Box sx={{ mt: 2 }} onClick={(e) => e.stopPropagation()}>
                          {templatesLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {templates.map((tpl) => (
                                <Box
                                  key={tpl.id}
                                  onClick={() => setSelectedTemplateId(tpl.id)}
                                  sx={{
                                    display: "flex", alignItems: "center", gap: 1.5,
                                    p: 1.5, borderRadius: 1.5, cursor: "pointer",
                                    border: "1px solid",
                                    borderColor: selectedTemplateId === tpl.id ? "#0052CC" : "#DFE1E6",
                                    bgcolor: selectedTemplateId === tpl.id ? "#EBF2FF" : "#fff",
                                    transition: "all 0.15s",
                                    "&:hover": { borderColor: "#0052CC" },
                                  }}
                                >
                                  <Article sx={{ color: tpl.is_system ? "#5243AA" : "#0052CC", fontSize: 20, flexShrink: 0 }} />
                                  <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#172B4D" }}>
                                        {tpl.name}
                                      </Typography>
                                      {tpl.is_system && <Lock sx={{ fontSize: 12, color: "#5243AA" }} />}
                                    </Box>
                                    <Typography variant="caption" sx={{ color: "#97A0AF" }}>
                                      {tpl.stages_count} этапов
                                    </Typography>
                                  </Box>
                                  {selectedTemplateId === tpl.id && (
                                    <CheckCircle sx={{ color: "#0052CC", fontSize: 18 }} />
                                  )}
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Manual option */}
                <Box
                  onClick={() => setPlanType("manual")}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: "1.5px solid",
                    borderColor:
                      planType === "manual" ? "#0052CC" : "#DFE1E6",
                    bgcolor:
                      planType === "manual" ? "#DEEBFF" : "white",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: "#0052CC",
                      bgcolor:
                        planType === "manual" ? "#DEEBFF" : "#F4F5F7",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor:
                          planType === "manual" ? "#0052CC" : "#F4F5F7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <EditNote
                        sx={{
                          color:
                            planType === "manual" ? "white" : "#5E6C84",
                          fontSize: 22,
                        }}
                      />
                    </Box>
                    <Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
                      >
                        <Typography variant="body1" fontWeight={700} color="#172B4D">
                          Составить план самостоятельно
                        </Typography>
                        {planType === "manual" && (
                          <CheckCircle sx={{ color: "#0052CC", fontSize: 18 }} />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Проект создаётся без этапов. Вы самостоятельно добавите
                        этапы и задачи в детальном просмотре проекта.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {(createMut.isError || templateMut.isError) && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {createMut.isError
                    ? "Ошибка при создании проекта. Проверьте данные и попробуйте ещё раз."
                    : "Проект создан, но не удалось сгенерировать шаблон. Вы можете создать его в настройках проекта."}
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          disabled={activeStep === 0 || isBusy}
          onClick={() => setActiveStep((s) => s - 1)}
          sx={{ textTransform: "none" }}
        >
          Назад
        </Button>

        {isLastStep ? (
          <Button
            variant="contained"
            disabled={!canNext || isBusy}
            onClick={handleFinish}
            startIcon={
              isBusy ? <CircularProgress size={16} color="inherit" /> : undefined
            }
            sx={{
              textTransform: "none",
              bgcolor: "#0052CC",
              "&:hover": { bgcolor: "#0747A6" },
            }}
          >
            {isBusy ? "Создание..." : "Создать проект"}
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            disabled={!canNext}
            onClick={() => setActiveStep((s) => s + 1)}
            sx={{
              textTransform: "none",
              bgcolor: "#0052CC",
              "&:hover": { bgcolor: "#0747A6" },
            }}
          >
            Далее
          </Button>
        )}
      </Box>
    </Box>
  );
}
