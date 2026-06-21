import { api } from "./axios";
import type { StageTask, TaskStatus, TaskType } from "../types";

export interface TaskPayload {
  title: string;
  description: string;
  deadline: string | null;
  status: TaskStatus;
  task_type?: TaskType;
}

export const getTasks = async (
  projectId: number,
  stageId: number
): Promise<StageTask[]> => {
  const res = await api.get<StageTask[]>(
    `/projects/${projectId}/stages/${stageId}/tasks/`
  );
  return res.data;
};

export const createTask = async (
  projectId: number,
  stageId: number,
  data: TaskPayload
): Promise<StageTask> => {
  const res = await api.post<StageTask>(
    `/projects/${projectId}/stages/${stageId}/tasks/`,
    data
  );
  return res.data;
};

export const updateTask = async (
  projectId: number,
  stageId: number,
  taskId: number,
  data: Partial<TaskPayload>
): Promise<StageTask> => {
  const res = await api.patch<StageTask>(
    `/projects/${projectId}/stages/${stageId}/tasks/${taskId}/`,
    data
  );
  return res.data;
};

export const deleteTask = async (
  projectId: number,
  stageId: number,
  taskId: number
): Promise<void> => {
  await api.delete(
    `/projects/${projectId}/stages/${stageId}/tasks/${taskId}/`
  );
};
