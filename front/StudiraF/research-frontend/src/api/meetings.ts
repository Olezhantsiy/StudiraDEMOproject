import { api } from "./axios";
import type { Meeting, MeetingCreate, MeetingUpdate } from "../types";

export const meetingsApi = {
  list: (params?: { project?: number; status?: string }) =>
    api.get<Meeting[]>("/meetings/", { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<Meeting>(`/meetings/${id}/`).then((r) => r.data),

  create: (data: MeetingCreate) =>
    api.post<Meeting>("/meetings/", data).then((r) => r.data),

  update: (id: number, data: MeetingUpdate) =>
    api.patch<Meeting>(`/meetings/${id}/`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/meetings/${id}/`),
};
