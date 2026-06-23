import type { User } from "@chat-agent/shared";
import { apiRequest } from "./client";

export async function login(emailOrUsername: string, password: string): Promise<User> {
  const response = await apiRequest<{ user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrUsername, password }),
  });
  return response.user;
}

export async function register(params: {
  username: string;
  email: string;
  password: string;
}): Promise<User> {
  const response = await apiRequest<{ user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return response.user;
}

export async function logout(): Promise<void> {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getMe(): Promise<User> {
  const response = await apiRequest<{ user: User }>("/auth/me");
  return response.user;
}
