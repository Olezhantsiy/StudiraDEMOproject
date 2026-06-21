import { api } from "./axios";
import type {
  ResearchProject,
  ProjectStatus,
  StudentEnrollment,
  UserShort,
  ProjectTaskStats,
  ProjectStatsDetail,
  SupervisorSummary,
  DepartmentSummaryRow,
} from "../types";

export const getProjects = async (): Promise<ResearchProject[]> => {
  const response = await api.get<ResearchProject[]>("/projects/");
  return response.data;
};

export const getProject = async (id: number): Promise<ResearchProject> => {
  const response = await api.get<ResearchProject>(`/projects/${id}/`);
  return response.data;
};

export interface CreateProjectPayload {
  enrollment_id: number;
  title: string;
  description: string;
  keywords: string;
  start_date: string;
  status: ProjectStatus;
}

export const createProject = async (
  data: CreateProjectPayload
): Promise<ResearchProject> => {
  const response = await api.post<ResearchProject>("/projects/", data);
  return response.data;
};

export const getEnrollments = async (): Promise<StudentEnrollment[]> => {
  const response = await api.get<StudentEnrollment[]>("/enrollments/");
  return response.data;
};

export const getStudents = async (): Promise<UserShort[]> => {
  const response = await api.get<UserShort[]>("/students/");
  return response.data;
};

export interface UpdateProjectPayload {
  title?: string;
  description?: string;
  keywords?: string;
  start_date?: string;
  status?: ProjectStatus;
}

export const updateProject = async (
  id: number,
  data: UpdateProjectPayload
): Promise<ResearchProject> => {
  const response = await api.patch<ResearchProject>(`/projects/${id}/`, data);
  return response.data;
};

export const getProjectDashboardStats = async (): Promise<ProjectTaskStats[]> => {
  const response = await api.get<ProjectTaskStats[]>("/projects/dashboard-stats/");
  return response.data;
};

export const getProjectStats = async (id: number): Promise<ProjectStatsDetail> => {
  const response = await api.get<ProjectStatsDetail>(`/projects/${id}/stats/`);
  return response.data;
};

export const getSupervisorSummary = async (
  supervisorId?: number
): Promise<SupervisorSummary> => {
  const response = await api.get<SupervisorSummary>("/projects/supervisor-summary/", {
    params: supervisorId ? { supervisor_id: supervisorId } : undefined,
  });
  return response.data;
};

export const getDepartmentSummary = async (): Promise<DepartmentSummaryRow[]> => {
  const response = await api.get<DepartmentSummaryRow[]>("/projects/department-summary/");
  return response.data;
};
