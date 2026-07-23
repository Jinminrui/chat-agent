import { api } from './client';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User } from '@/types/auth';

/**
 * 用户登录
 *
 * @param emailOrUsername - 邮箱或用户名
 * @param password - 密码
 * @returns 登录成功的用户信息
 */
export async function login(emailOrUsername: string, password: string): Promise<User> {
  const response = await api.post<LoginResponse>('/api/auth/login', { emailOrUsername, password });
  return response.data.user;
}

/**
 * 用户注册
 *
 * @param params - 注册参数（用户名、邮箱、密码）
 * @returns 注册成功的用户信息
 */
export async function register(params: RegisterRequest): Promise<User> {
  const response = await api.post<RegisterResponse>('/api/auth/register', params);
  return response.data.user;
}

/**
 * 用户登出
 *
 * 清除服务端 session，客户端 cookie 会被自动清除。
 */
export async function logout(): Promise<void> {
  await api.post<void>('/api/auth/logout');
}

/**
 * 获取当前用户信息
 *
 * 用于验证登录状态，未登录时会抛出 401 错误。
 * @returns 当前用户信息
 */
export async function getMe(): Promise<User> {
  const response = await api.get<{ user: User }>('/api/auth/me');
  return response.data.user;
}
