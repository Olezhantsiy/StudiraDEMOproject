export type UserRole = "STD" | "SPV" | "HOD" | "ADM";

export const RoleLabels: Record<UserRole, string> = {
  STD: "Студент",
  SPV: "Дипломный руководитель",
  HOD: "Заведующий кафедрой",
  ADM: "Администратор",
};

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  role: UserRole;
  date_joined: string;
  last_login: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface RefreshRequest {
  refresh: string;
}

// --- Projects ---

export type ProjectStatus =
  | "DRAFT"
  | "APPROVED"
  | "IN_PROGRESS"
  | "PRE_DEFENSE"
  | "DEFENDED"
  | "REJECTED";

export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  DRAFT: "Черновик",
  APPROVED: "Утверждён",
  IN_PROGRESS: "В работе",
  PRE_DEFENSE: "Предзащита",
  DEFENDED: "Защищён",
  REJECTED: "Отклонён",
};

export const ProjectStatusColors: Record<
  ProjectStatus,
  { bg: string; color: string }
> = {
  DRAFT: { bg: "#F4F5F7", color: "#42526E" },
  APPROVED: { bg: "#DEEBFF", color: "#0747A6" },
  IN_PROGRESS: { bg: "#FFF0B3", color: "#FF8B00" },
  PRE_DEFENSE: { bg: "#EAE6FF", color: "#403294" },
  DEFENDED: { bg: "#E3FCEF", color: "#006644" },
  REJECTED: { bg: "#FFEBE6", color: "#BF2600" },
};

export interface UserShort {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
}

// --- Degree & Enrollment ---

export type DegreeLevel = "MAG" | "ASP";

export const DegreeLevelLabels: Record<DegreeLevel, string> = {
  MAG: "Магистратура",
  ASP: "Аспирантура",
};

export const DegreeLevelColors: Record<DegreeLevel, { bg: string; color: string }> = {
  MAG: { bg: "#EAE6FF", color: "#403294" },
  ASP: { bg: "#DEEBFF", color: "#0747A6" },
};

export type EnrollmentStatus =
  | "ACTIVE"
  | "TRANSFERRED"
  | "GRADUATED"
  | "EXPELLED"
  | "ACADEMIC";

export const EnrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  ACTIVE: "Обучается",
  TRANSFERRED: "Переведён",
  GRADUATED: "Выпущен",
  EXPELLED: "Отчислен",
  ACADEMIC: "Акад. отпуск",
};

export const EnrollmentStatusColors: Record<EnrollmentStatus, { bg: string; color: string }> = {
  ACTIVE: { bg: "#E3FCEF", color: "#006644" },
  TRANSFERRED: { bg: "#FFF0B3", color: "#FF8B00" },
  GRADUATED: { bg: "#DEEBFF", color: "#0747A6" },
  EXPELLED: { bg: "#FFEBE6", color: "#BF2600" },
  ACADEMIC: { bg: "#F4F5F7", color: "#42526E" },
};

export interface AcademicGroup {
  id: number;
  name: string;
  program?: {
    id: number;
    full_name: string;
    short_name: string;
    degree_level: DegreeLevel;
  };
}

export interface StudentEnrollment {
  id: number;
  student: UserShort;
  group?: AcademicGroup;
  supervisor?: UserShort | null;
  start_date?: string;
  end_date?: string;
  status?: EnrollmentStatus;
}

// --- Indexing Systems ---

export interface IndexingSystem {
  id: number;
  name: string;
}

// --- Publications ---

export type PublicationType = "ARTICLE" | "THESIS" | "CONFERENCE";

export const PublicationTypeLabels: Record<PublicationType, string> = {
  ARTICLE: "Статья",
  THESIS: "Тезисы",
  CONFERENCE: "Доклад",
};

export const PublicationTypeColors: Record<PublicationType, { bg: string; color: string }> = {
  ARTICLE: { bg: "#DEEBFF", color: "#0747A6" },
  THESIS: { bg: "#EAE6FF", color: "#403294" },
  CONFERENCE: { bg: "#E3FCEF", color: "#006644" },
};

export type PublicationStatus = "DRAFT" | "PENDING" | "PRINT" | "PUBLISHED" | "REJECTED";

export const PublicationStatusLabels: Record<PublicationStatus, string> = {
  DRAFT: "Черновик",
  PENDING: "На рассмотрении",
  PRINT: "В печати",
  PUBLISHED: "Опубликована",
  REJECTED: "Отклонена",
};

export const PublicationStatusColors: Record<PublicationStatus, { bg: string; color: string }> = {
  DRAFT: { bg: "#F4F5F7", color: "#42526E" },
  PENDING: { bg: "#DEEBFF", color: "#0747A6" },
  PRINT: { bg: "#FFF0B3", color: "#FF8B00" },
  PUBLISHED: { bg: "#E3FCEF", color: "#006644" },
  REJECTED: { bg: "#FFEBE6", color: "#BF2600" },
};

export interface Publication {
  id: number;
  task: number;
  type: PublicationType;
  status: PublicationStatus;
  title: string;
  url: string;
  doi: string;
  year: number | null;
  indexes: IndexingSystem[];
  publisher: string;
  created_at: string;
}

export interface ResearchProject {
  id: number;
  enrollment: StudentEnrollment;
  supervisor: UserShort | null;
  title: string;
  description: string;
  keywords: string;
  start_date: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

// --- Dashboard stats ---

export interface ProjectTaskStats {
  project_id: number;
  total: number;
  done: number;
  in_progress: number;
  todo: number;
  overdue: number;
  completion_percent: number;
}

// --- Monitoring / statistics ---

export interface StatTask {
  id: number;
  title: string;
  status: TaskStatus;
  deadline: string | null;
  stage_name: string;
}

export interface BurndownPoint {
  date: string;
  ideal_remaining: number;
  actual_remaining: number;
}

export interface ProjectProgress {
  total: number;
  done: number;
  in_progress: number;
  todo: number;
  overdue: number;
  completion_percent: number;
}

export interface ProjectStatsDetail {
  project_id: number;
  project_title: string;
  progress: ProjectProgress;
  upcoming_tasks: StatTask[];
  overdue_tasks: StatTask[];
  burndown: BurndownPoint[];
}

export interface UserMini {
  id: number;
  username: string;
  full_name: string;
}

export interface StudentSummaryRow {
  student: UserMini | null;
  project_id: number;
  project_title: string;
  status: ProjectStatus;
  completion_percent: number;
  overdue: number;
  total: number;
}

export interface SupervisorSummary {
  supervisor: UserMini | null;
  students_count: number;
  avg_completion_percent: number;
  total_overdue_tasks: number;
  students: StudentSummaryRow[];
}

export interface DepartmentSummaryRow {
  supervisor: UserMini | null;
  students_count: number;
  avg_completion_percent: number;
  total_overdue_tasks: number;
}

// --- Stages ---

export type StageStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

export const StageStatusLabels: Record<StageStatus, string> = {
  PENDING: "Ожидает начала",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершён",
  OVERDUE: "Просрочен",
};

export const StageStatusColors: Record<StageStatus, { bg: string; color: string }> = {
  PENDING: { bg: "#F4F5F7", color: "#42526E" },
  IN_PROGRESS: { bg: "#FFF0B3", color: "#FF8B00" },
  COMPLETED: { bg: "#E3FCEF", color: "#006644" },
  OVERDUE: { bg: "#FFEBE6", color: "#BF2600" },
};

export interface ResearchStage {
  id: number;
  project: number;
  name: string;
  order: number;
  start_date: string;
  deadline: string;
  status: StageStatus;
}

// --- Tasks ---

export type TaskType = "FILE" | "PUBLICATION";

export const TaskTypeLabels: Record<TaskType, string> = {
  FILE: "Загрузка файла",
  PUBLICATION: "Публикация",
};

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "OVERDUE";

export const TaskStatusLabels: Record<TaskStatus, string> = {
  TODO: "Не начата",
  IN_PROGRESS: "В работе",
  DONE: "Выполнена",
  OVERDUE: "Просрочена",
};

export const TaskStatusColors: Record<TaskStatus, { bg: string; color: string }> = {
  TODO: { bg: "#F4F5F7", color: "#42526E" },
  IN_PROGRESS: { bg: "#FFF0B3", color: "#FF8B00" },
  DONE: { bg: "#E3FCEF", color: "#006644" },
  OVERDUE: { bg: "#FFEBE6", color: "#BF2600" },
};

export interface StageTask {
  id: number;
  stage: number;
  title: string;
  description: string;
  deadline: string | null;
  task_type: TaskType;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
}

// --- Submissions ---

export type SubmissionStatus = "SUBMITTED" | "NEEDS_REVISION" | "APPROVED";

export const SubmissionStatusLabels: Record<SubmissionStatus, string> = {
  SUBMITTED: "Отправлено",
  NEEDS_REVISION: "На доработку",
  APPROVED: "Принято",
};

export const SubmissionStatusColors: Record<SubmissionStatus, { bg: string; color: string }> = {
  SUBMITTED: { bg: "#DEEBFF", color: "#0747A6" },
  NEEDS_REVISION: { bg: "#FFF0B3", color: "#FF8B00" },
  APPROVED: { bg: "#E3FCEF", color: "#006644" },
};

export interface TaskSubmission {
  id: number;
  task: number;
  text: string;
  file: string;
  report: string | null;
  status: SubmissionStatus;
  created_at: string;
}

export type ReviewDecision = "APPROVED" | "NEEDS_REVISION";

export const ReviewDecisionLabels: Record<ReviewDecision, string> = {
  APPROVED: "Принято",
  NEEDS_REVISION: "На доработку",
};

export const ReviewDecisionColors: Record<ReviewDecision, { bg: string; color: string }> = {
  APPROVED: { bg: "#E3FCEF", color: "#006644" },
  NEEDS_REVISION: { bg: "#FFF0B3", color: "#FF8B00" },
};

export interface SubmissionReview {
  id: number;
  submission: number;
  reviewer: UserShort;
  comment: string;
  decision: ReviewDecision;
  created_at: string;
}

// --- Plan Templates ---
export interface PlanTemplateTask {
  id: number;
  title: string;
  order: number;
  task_type: TaskType;
}

export interface PlanTemplateStage {
  id: number;
  name: string;
  order: number;
  duration_days: number;
  tasks: PlanTemplateTask[];
}

export interface PlanTemplate {
  id: number;
  name: string;
  description: string;
  created_by: UserShort | null;
  is_system: boolean;
  stages_count: number;
  stages: PlanTemplateStage[];
  created_at: string;
  updated_at: string;
}

// --- Meetings ---

export type MeetingStatus = "PLANNED" | "DONE" | "CANCELLED";

export const MeetingStatusLabels: Record<MeetingStatus, string> = {
  PLANNED: "Планируется",
  DONE: "Проведено",
  CANCELLED: "Отменено",
};

export const MeetingStatusColors: Record<MeetingStatus, { bg: string; color: string }> = {
  PLANNED: { bg: "#DEEBFF", color: "#0747A6" },
  DONE: { bg: "#E3FCEF", color: "#006644" },
  CANCELLED: { bg: "#FFEBE6", color: "#BF2600" },
};

export interface Meeting {
  id: number;
  project: number;
  organizer: number;
  organizer_detail: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    middle_name: string;
    full_name: string;
    role: UserRole;
  };
  title: string;
  datetime: string;
  duration_minutes: number;
  location: string;
  timezone: string;
  notes: string;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
}

export interface MeetingCreate {
  project: number;
  title: string;
  datetime: string;
  duration_minutes?: number;
  timezone?: string;
  notes?: string;
}

export interface MeetingUpdate {
  title?: string;
  datetime?: string;
  duration_minutes?: number;
  timezone?: string;
  notes?: string;
  status?: MeetingStatus;
}

export interface PlanTemplateListItem {
  id: number;
  name: string;
  description: string;
  created_by: UserShort | null;
  is_system: boolean;
  stages_count: number;
  created_at: string;
}
