import { api } from "./axios";
import type { PlanTemplate, PlanTemplateListItem } from "../types";

export interface TemplateStagePayload {
  name: string;
  order: number;
  duration_days: number;
  tasks: { title: string; order: number; task_type?: string }[];
}

export interface TemplatePayload {
  name: string;
  description?: string;
  stages: TemplateStagePayload[];
}

export const getTemplates = async (): Promise<PlanTemplateListItem[]> => {
  const res = await api.get<PlanTemplateListItem[]>("/plan-templates/");
  return res.data;
};

export const getTemplate = async (id: number): Promise<PlanTemplate> => {
  const res = await api.get<PlanTemplate>(`/plan-templates/${id}/`);
  return res.data;
};

export const createTemplate = async (data: TemplatePayload): Promise<PlanTemplate> => {
  const res = await api.post<PlanTemplate>("/plan-templates/", data);
  return res.data;
};

export const updateTemplate = async (
  id: number,
  data: Partial<TemplatePayload>
): Promise<PlanTemplate> => {
  const res = await api.patch<PlanTemplate>(`/plan-templates/${id}/`, data);
  return res.data;
};

export const deleteTemplate = async (id: number): Promise<void> => {
  await api.delete(`/plan-templates/${id}/`);
};
