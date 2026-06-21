import { api } from "./axios";
import type { TaskSubmission, SubmissionReview, ReviewDecision } from "../types";

const BASE = "http://127.0.0.1:8000/api";

export const getSubmissions = async (
  projectId: number,
  stageId: number,
  taskId: number
): Promise<TaskSubmission[]> => {
  const res = await api.get<TaskSubmission[]>(
    `/projects/${projectId}/stages/${stageId}/tasks/${taskId}/submissions/`
  );
  return res.data;
};

export const createSubmission = async (
  projectId: number,
  stageId: number,
  taskId: number,
  formData: FormData
): Promise<TaskSubmission> => {
  const res = await api.post<TaskSubmission>(
    `/projects/${projectId}/stages/${stageId}/tasks/${taskId}/submissions/`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
};

// ─── Reviews ────────────────────────────────────────────────────────────────

const reviewBase = (
  projectId: number,
  stageId: number,
  taskId: number,
  submissionId: number
) =>
  `/projects/${projectId}/stages/${stageId}/tasks/${taskId}/submissions/${submissionId}/review/`;

export const getReviews = async (
  projectId: number,
  stageId: number,
  taskId: number,
  submissionId: number
): Promise<SubmissionReview[]> => {
  const res = await api.get<SubmissionReview[]>(reviewBase(projectId, stageId, taskId, submissionId));
  return res.data;
};

export const createReview = async (
  projectId: number,
  stageId: number,
  taskId: number,
  submissionId: number,
  data: { decision: ReviewDecision; comment?: string }
): Promise<SubmissionReview> => {
  const res = await api.post<SubmissionReview>(reviewBase(projectId, stageId, taskId, submissionId), data);
  return res.data;
};

export const updateReview = async (
  projectId: number,
  stageId: number,
  taskId: number,
  submissionId: number,
  reviewId: number,
  data: { decision?: ReviewDecision; comment?: string }
): Promise<SubmissionReview> => {
  const res = await api.patch<SubmissionReview>(
    `${reviewBase(projectId, stageId, taskId, submissionId)}${reviewId}/`,
    data
  );
  return res.data;
};

export const downloadFile = async (
  projectId: number,
  stageId: number,
  taskId: number,
  submissionId: number,
  type: "download" | "download_report" = "download"
): Promise<void> => {
  const token = localStorage.getItem("access_token");
  const url = `${BASE}/projects/${projectId}/stages/${stageId}/tasks/${taskId}/submissions/${submissionId}/${type}/`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!response.ok) return;
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="(.+?)"/);
  const filename = match ? match[1] : "file";
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};
