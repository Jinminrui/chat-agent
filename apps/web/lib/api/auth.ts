import type { User } from "@chat-agent/shared";
import { apiRequest } from "./client";

export async function login(emailOrUsername: string, password: string): Promise<User> {
  return apiRequest<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrUsername, password }),
  });
}

export async function register(params: {
  username: string;
  email: string;
  password: string;
}): Promise<User> {
  return apiRequest<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function logout(): Promise<void> {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getMe(): Promise<User> {
  return apiRequest<User>("/auth/me");
}
