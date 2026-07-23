import { type ApiResponse, isSuccess } from '@/types/api';

/** API 基础地址，优先使用环境变量，默认为相对路径 /api */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

/**
 * 统一的 HTTP 请求函数
 *
 * 核心职责：
 * - 拼接完整 URL
 * - 自动携带 cookie（credentials: 'include'）
 * - 处理 401 未授权（自动跳转登录页）
 * - 处理 204 无内容响应
 * - 解析统一格式的 ApiResponse，失败时抛出 ApiError
 */
async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  // 401 未登录：客户端环境跳转登录页，服务端环境直接抛错
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError(401, '未登录');
  }

  // 204 无内容：如 DELETE 成功，返回统一格式的空响应
  if (response.status === 204) {
    return { code: 0, msg: 'ok', data: undefined as T };
  }

  const data: ApiResponse<T> = await response.json();

  // 业务错误：code !== 0 表示后端返回了错误
  if (!isSuccess(data)) {
    throw new ApiError(data.code, data.msg);
  }

  return data;
}

/**
 * API 客户端对象
 *
 * 封装常用 HTTP 方法，自动处理请求/响应格式。
 * 所有方法返回 Promise<ApiResponse<T>>，失败时抛出 ApiError。
 */
export const api = {
  get<T>(endpoint: string) {
    return request<T>(endpoint, { method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string) {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};

/**
 * API 错误类
 *
 * 当后端返回非成功响应时抛出，包含业务错误码和错误信息。
 * 可通过 error.code 和 error.msg 获取详细信息。
 */
export class ApiError extends Error {
  constructor(
    public code: number,
    public msg: string
  ) {
    super(msg);
    this.name = 'ApiError';
  }
}
