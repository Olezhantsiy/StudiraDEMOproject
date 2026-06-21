import { api } from "./axios";
import type { Publication, PublicationType, PublicationStatus, IndexingSystem } from "../types";

export interface PublicationPayload {
  title: string;
  url?: string;
  doi?: string;
  type: PublicationType;
  status: PublicationStatus;
  year?: number | null;
  index_ids?: number[];
  publisher?: string;
}

export const getIndexingSystems = async (): Promise<IndexingSystem[]> => {
  const res = await api.get<IndexingSystem[]>("/indexing-systems/");
  return res.data;
};

// ─── Project-level listing (read) ────────────────────────────────────────────

export const getPublications = async (projectId: number): Promise<Publication[]> => {
  const response = await api.get<Publication[]>(`/projects/${projectId}/publications/`);
  return response.data;
};

// ─── Task-level CRUD ──────────────────────────────────────────────────────────

const taskPubBase = (projectId: number, stageId: number, taskId: number) =>
  `/projects/${projectId}/stages/${stageId}/tasks/${taskId}/publications/`;

export const getTaskPublications = async (
  projectId: number,
  stageId: number,
  taskId: number
): Promise<Publication[]> => {
  const res = await api.get<Publication[]>(taskPubBase(projectId, stageId, taskId));
  return res.data;
};

export const createTaskPublication = async (
  projectId: number,
  stageId: number,
  taskId: number,
  data: PublicationPayload
): Promise<Publication> => {
  const res = await api.post<Publication>(taskPubBase(projectId, stageId, taskId), data);
  return res.data;
};

export const updateTaskPublication = async (
  projectId: number,
  stageId: number,
  taskId: number,
  pubId: number,
  data: Partial<PublicationPayload>
): Promise<Publication> => {
  const res = await api.patch<Publication>(
    `${taskPubBase(projectId, stageId, taskId)}${pubId}/`,
    data
  );
  return res.data;
};

export const deleteTaskPublication = async (
  projectId: number,
  stageId: number,
  taskId: number,
  pubId: number
): Promise<void> => {
  await api.delete(`${taskPubBase(projectId, stageId, taskId)}${pubId}/`);
};

// Legacy project-level mutations (kept for PublicationsPage backward compat)
export const createPublication = async (
  projectId: number,
  data: PublicationPayload
): Promise<Publication> => {
  const response = await api.post<Publication>(`/projects/${projectId}/publications/`, data);
  return response.data;
};

export const updatePublication = async (
  projectId: number,
  pubId: number,
  data: Partial<PublicationPayload>
): Promise<Publication> => {
  const response = await api.patch<Publication>(
    `/projects/${projectId}/publications/${pubId}/`,
    data
  );
  return response.data;
};

export const deletePublication = async (projectId: number, pubId: number): Promise<void> => {
  await api.delete(`/projects/${projectId}/publications/${pubId}/`);
};
