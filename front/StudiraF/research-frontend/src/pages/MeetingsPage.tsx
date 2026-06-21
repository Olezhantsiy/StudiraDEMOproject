import { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import type { EventClickArg, DateSelectArg, EventDropArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import ruLocale from "@fullcalendar/core/locales/ru";

import ReactDatePicker from "react-datepicker";
import { ru } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Add, Edit, Delete, AccessTime, Person, Close, Warning } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "../api/meetings";
import { api } from "../api/axios";
import { useAuth } from "../contexts/AuthContext";
import {
  type Meeting,
  type MeetingCreate,
  type MeetingUpdate,
  type ResearchProject,
  MeetingStatusLabels,
  MeetingStatusColors,
} from "../types";

// ─── Moscow timezone helpers ──────────────────────────────────────────────────

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3

/**
 * UTC ISO → "fake-local" Date for react-datepicker / FullCalendar.
 * We shift by +3h so that JS (which uses browser local time) shows the correct MSK wall-clock.
 */
function utcToFakeMsk(utcStr: string): Date {
  return new Date(new Date(utcStr).getTime() + MSK_OFFSET_MS);
}

/**
 * "Fake-local MSK" Date → UTC ISO string.
 */
function fakeMskToUtc(d: Date): string {
  return new Date(d.getTime() - MSK_OFFSET_MS).toISOString();
}

/**
 * Format UTC ISO string for display in Moscow time.
 */
function fmtMsk(utcStr: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(utcStr).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    ...opts,
  });
}

// ─── Status colors for FullCalendar ──────────────────────────────────────────

const statusEventColors: Record<string, string> = {
  PLANNED: "#0052CC",
  DONE: "#006644",
  CANCELLED: "#BF2600",
};

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  project: number;
  title: string;
  datetimeDate: Date | null;
  duration_minutes: number;
  notes: string;
}

const emptyForm = (): FormState => ({
  project: 0,
  title: "",
  datetimeDate: null,
  duration_minutes: 60,
  notes: "",
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const qc = useQueryClient();
  const calRef = useRef<FullCalendar>(null);
  const isSupervisorOrHead = user?.role === "SPV" || user?.role === "HOD";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => meetingsApi.list(),
  });

  const { data: projects = [] } = useQuery<ResearchProject[]>({
    queryKey: ["projects-list"],
    queryFn: () => api.get<ResearchProject[]>("/projects/").then((r) => r.data),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: MeetingCreate) => meetingsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings"] }); closeDialog(); },
    onError: (err: unknown) => {
      setFormError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Ошибка при создании встречи"
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MeetingUpdate }) =>
      meetingsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings"] }); closeDialog(); },
    onError: (err: unknown) => {
      setFormError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Ошибка при обновлении встречи"
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => meetingsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      setDetailMeeting(null);
      setDeleteTarget(null);
    },
  });

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingMeeting(null);
    setForm(emptyForm());
    setFormError(null);
  };

  const openCreate = (slotStart?: Date) => {
    setEditingMeeting(null);
    setForm({
      ...emptyForm(),
      datetimeDate: slotStart ? utcToFakeMsk(slotStart.toISOString()) : null,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setForm({
      project: meeting.project,
      title: meeting.title,
      datetimeDate: utcToFakeMsk(meeting.datetime),
      duration_minutes: meeting.duration_minutes,
      notes: meeting.notes,
    });
    setFormError(null);
    setDetailMeeting(null);
    setDialogOpen(true);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!form.title.trim()) { setFormError("Укажите название встречи"); return; }
    if (!form.datetimeDate) { setFormError("Укажите дату и время"); return; }
    if (!form.project) { setFormError("Выберите проект"); return; }

    const payload: MeetingCreate = {
      project: form.project,
      title: form.title,
      datetime: fakeMskToUtc(form.datetimeDate),
      duration_minutes: form.duration_minutes,
      notes: form.notes,
      timezone: "Europe/Moscow",
    };

    if (editingMeeting) {
      updateMutation.mutate({ id: editingMeeting.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── FullCalendar events (pre-converted UTC → fake-MSK) ────────────────────

  const calEvents = meetings.map((m) => {
    const start = utcToFakeMsk(m.datetime);
    const end = new Date(start.getTime() + m.duration_minutes * 60_000);
    return {
      id: String(m.id),
      title: m.title,
      start,
      end,
      backgroundColor: statusEventColors[m.status] ?? "#0052CC",
      borderColor: statusEventColors[m.status] ?? "#0052CC",
      extendedProps: { meeting: m },
    };
  });

  // ── Drag-to-reschedule (supervisor/head only) ─────────────────────────────

  const handleEventDrop = (info: EventDropArg) => {
    if (!isSupervisorOrHead) { info.revert(); return; }
    const m: Meeting = info.event.extendedProps.meeting;
    updateMutation.mutate({ id: m.id, data: { datetime: fakeMskToUtc(info.event.start!) } });
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Page header — same pattern as ProjectsPage / TemplatesPage ── */}
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
          <Typography variant="h5" fontWeight={700} color="#172B4D">
            Встречи
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Планирование встреч с научным руководителем
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => openCreate()}
          sx={{ borderRadius: 2 }}
        >
          Создать встречу
        </Button>
      </Box>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {/* ── FullCalendar ── */}
      {!isLoading && (
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #DFE1E6",
            borderRadius: 2,
            p: { xs: 1, sm: 2 },
            height: { xs: "auto", md: "calc(100vh - 200px)" },
            minHeight: { xs: 480, md: "auto" },
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            "& .fc": { fontFamily: "Inter, sans-serif", flex: 1, minHeight: 0 },
            "& .fc-scroller": { overflowY: "auto !important" },
            "& .fc-toolbar-title": { fontSize: "1.1rem", fontWeight: 700 },
            "& .fc-button": {
              bgcolor: "transparent !important",
              color: "#0052CC !important",
              border: "1px solid #DFE1E6 !important",
              boxShadow: "none !important",
              textTransform: "capitalize",
              fontSize: "13px !important",
              padding: "4px 10px !important",
            },
            "& .fc-button:hover": { bgcolor: "#DEEBFF !important" },
            "& .fc-button-active, & .fc-button-primary:not(:disabled).fc-button-active": {
              bgcolor: "#0052CC !important",
              color: "#fff !important",
              borderColor: "#0052CC !important",
            },
            "& .fc-today-button": {
              bgcolor: "#F4F5F7 !important",
              color: "#42526E !important",
            },
            "& .fc-daygrid-day.fc-day-today": { bgcolor: "#DEEBFF33" },
            "& .fc-timegrid-now-indicator-line": { borderColor: "#0052CC" },
            "& .fc-event": { borderRadius: "4px", cursor: "pointer", fontSize: "12px" },
            "& .fc-list-event:hover td": { bgcolor: "#F4F5F7 !important" },
          }}
        >
          <FullCalendar
            key={isMobile ? "mobile" : "desktop"}
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={isMobile ? "listMonth" : "dayGridMonth"}
            locale={ruLocale}
            headerToolbar={
              isMobile
                ? {
                    left: "prev,next",
                    center: "title",
                    right: "listMonth,dayGridMonth",
                  }
                : {
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
                  }
            }
            buttonText={{
              today: "Сегодня",
              month: "Месяц",
              week: "Неделя",
              day: "День",
              list: "Повестка",
            }}
            events={calEvents}
            selectable
            selectMirror
            editable={isSupervisorOrHead}
            eventDrop={handleEventDrop}
            select={(arg: DateSelectArg) => openCreate(arg.start)}
            eventClick={(arg: EventClickArg) =>
              setDetailMeeting(arg.event.extendedProps.meeting as Meeting)
            }
            height="100%"
            dayMaxEvents={3}
            nowIndicator
          />
        </Paper>
      )}

      {/* ── Delete confirmation dialog ── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Warning color="error" fontSize="small" />
          Удалить встречу?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Встреча <strong>«{deleteTarget?.title}»</strong> будет удалена без возможности
            восстановления.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setDeleteTarget(null)}>Отмена</Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail dialog ── */}
      <Dialog
        open={Boolean(detailMeeting)}
        onClose={() => setDetailMeeting(null)}
        maxWidth="sm"
        fullWidth
      >
        {detailMeeting && (
          <>
            <DialogTitle sx={{ pr: 6 }}>
              {detailMeeting.title}
              <IconButton
                onClick={() => setDetailMeeting(null)}
                sx={{ position: "absolute", right: 8, top: 8 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Chip
                  label={MeetingStatusLabels[detailMeeting.status]}
                  size="small"
                  sx={{
                    alignSelf: "flex-start",
                    bgcolor: MeetingStatusColors[detailMeeting.status].bg,
                    color: MeetingStatusColors[detailMeeting.status].color,
                    fontWeight: 600,
                  }}
                />
                <Divider />
                <Stack direction="row" spacing={1} alignItems="center">
                  <AccessTime sx={{ color: "#42526E", fontSize: 18 }} />
                  <Typography variant="body2">
                    {fmtMsk(detailMeeting.datetime, { dateStyle: "full", timeStyle: "short" })}
                    {" · "}{detailMeeting.duration_minutes} мин{" "}
                    <Typography component="span" variant="caption" color="text.secondary">
                      (МСК)
                    </Typography>
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Person sx={{ color: "#42526E", fontSize: 18 }} />
                  <Typography variant="body2">
                    {detailMeeting.organizer_detail.full_name}
                  </Typography>
                </Stack>
                {detailMeeting.notes && (
                  <>
                    <Divider />
                    <Typography variant="body2" whiteSpace="pre-wrap">
                      {detailMeeting.notes}
                    </Typography>
                  </>
                )}
              </Stack>
            </DialogContent>
            {(isSupervisorOrHead || detailMeeting.organizer === user?.id) && (
              <DialogActions sx={{ px: 3, py: 1.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => openEdit(detailMeeting)}
                >
                  Редактировать
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => {
                    setDetailMeeting(null);
                    setDeleteTarget(detailMeeting);
                  }}
                >
                  Удалить
                </Button>
              </DialogActions>
            )}
          </>
        )}
      </Dialog>

      {/* ── Create / Edit dialog ── */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMeeting ? "Редактировать встречу" : "Новая встреча"}
          <IconButton onClick={closeDialog} sx={{ position: "absolute", right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5} pt={0.5}>
            {formError && <Alert severity="error">{formError}</Alert>}

            {/* Project */}
            {!editingMeeting && (
              <FormControl fullWidth size="small">
                <InputLabel>Проект *</InputLabel>
                <Select
                  label="Проект *"
                  value={form.project || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, project: Number(e.target.value) }))
                  }
                >
                  {projects.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Title */}
            <TextField
              label="Название *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              size="small"
              fullWidth
            />

            {/* DateTime — react-datepicker rendered inside the dialog portal */}
            <Box>
              <Typography
                variant="caption"
                sx={{ display: "block", mb: 0.5, color: "#42526E", fontWeight: 500 }}
              >
                Дата и время (МСК) *
              </Typography>
              <ReactDatePicker
                selected={form.datetimeDate}
                onChange={(date) => setForm((f) => ({ ...f, datetimeDate: date }))}
                showTimeSelect
                timeIntervals={15}
                dateFormat="dd.MM.yyyy HH:mm"
                timeFormat="HH:mm"
                locale={ru}
                placeholderText="ДД.ММ.ГГГГ ЧЧ:ММ"
                disabled={!isSupervisorOrHead && Boolean(editingMeeting)}
                portalId="datepicker-portal"
                customInput={
                  <OutlinedInput
                    size="small"
                    fullWidth
                    readOnly
                    sx={{ width: "100%", cursor: "pointer" }}
                  />
                }
                wrapperClassName="datepicker-full-width"
              />
              {!isSupervisorOrHead && editingMeeting && (
                <FormHelperText sx={{ mt: 0.5, ml: 0.25 }}>
                  Только руководитель может переносить встречу
                </FormHelperText>
              )}
            </Box>

            {/* Duration */}
            <TextField
              label="Длительность (мин)"
              type="number"
              value={form.duration_minutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  duration_minutes: Math.max(1, Number(e.target.value)),
                }))
              }
              size="small"
              fullWidth
              inputProps={{ min: 1 }}
            />

            {/* Notes */}
            <TextField
              label="Заметки / повестка"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={closeDialog}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingMeeting ? "Сохранить" : "Создать"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Portal for datepicker — renders above MUI dialogs */}
      <div id="datepicker-portal" />
    </Box>
  );
}
