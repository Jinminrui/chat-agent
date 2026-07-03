import { type ApiResponse, isSuccess } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

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

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError(401, '未登录');
  }

  if (response.status === 204) {
    return { code: 0, msg: 'ok', data: undefined as T };
  }

  const data: ApiResponse<T> = await response.json();

  if (!isSuccess(data)) {
    throw new ApiError(data.code, data.msg);
  }

  return data;
}

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

export class ApiError extends Error {
  constructor(
    public code: number,
    public msg: string
  ) {
    super(msg);
    this.name = 'ApiError';
  }
}
