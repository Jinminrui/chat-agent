import { api } from './client';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User } from '@/types/auth';

export async function login(emailOrUsername: string, password: string): Promise<User> {
  const response = await api.post<LoginResponse>('/auth/login', { emailOrUsername, password });
  return response.data.user;
}

export async function register(params: RegisterRequest): Promise<User> {
  const response = await api.post<RegisterResponse>('/auth/register', params);
  return response.data.user;
}

export async function logout(): Promise<void> {
  await api.post<void>('/auth/logout');
}

export async function getMe(): Promise<User> {
  const response = await api.get<{ user: User }>('/auth/me');
  return response.data.user;
}
