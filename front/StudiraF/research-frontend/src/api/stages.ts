import { api } from "./axios";
import type { ResearchStage, StageStatus } from "../types";

export interface StagePayload {
  name: string;
  order: number;
  start_date: string;
  deadline: string;
  status: StageStatus;
}

export const getStages = async (projectId: number): Promise<ResearchStage[]> => {
  const res = await api.get<ResearchStage[]>(`/projects/${projectId}/stages/`);
  return res.data;
};

export const createStage = async (
  projectId: number,
  data: StagePayload
): Promise<ResearchStage> => {
  const res = await api.post<ResearchStage>(`/projects/${projectId}/stages/`, data);
  return res.data;
};

export const updateStage = async (
  projectId: number,
  stageId: number,
  data: Partial<StagePayload>
): Promise<ResearchStage> => {
  const res = await api.patch<ResearchStage>(
    `/projects/${projectId}/stages/${stageId}/`,
    data
  );
  return res.data;
};

export const deleteStage = async (
  projectId: number,
  stageId: number
): Promise<void> => {
  await api.delete(`/projects/${projectId}/stages/${stageId}/`);
};

export const generateTemplate = async (
  projectId: number,
  templateId?: number
): Promise<void> => {
  await api.post(`/projects/${projectId}/generate_template/`, templateId ? { template_id: templateId } : {});
};

export const downloadStageReport = async (
  projectId: number,
  stageId: number
): Promise<void> => {
  const response = await api.get(
    `/projects/${projectId}/stages/${stageId}/generate_report/`,
    { responseType: "blob" }
  );
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `stage_report_${stageId}.docx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
