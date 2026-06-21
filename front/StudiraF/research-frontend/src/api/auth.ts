import { api } from "./axios";
import type { LoginRequest, TokenResponse, User } from "../types";

export const login = async (data: LoginRequest): Promise<TokenResponse> => {
  const response = await api.post<TokenResponse>("/users/login/", data);
  return response.data;
};

export const getMe = async (): Promise<User> => {
  const response = await api.get<User>("/users/me/");
  return response.data;
};

export const updateMe = async (data: Partial<User>): Promise<User> => {
  const response = await api.patch<User>("/users/me/", data);
  return response.data;
};
