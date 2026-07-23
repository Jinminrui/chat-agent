/**
 * 统一 API 响应结构
 *
 * 所有后端接口都遵循此格式，前端通过 code 判断请求是否成功。
 * - code === 0: 成功
 * - code !== 0: 失败，msg 包含错误信息
 */
export type ApiResponse<T = unknown> = {
  code: number;
  msg: string;
  data: T;
};

/** 成功响应：code 固定为 0，msg 固定为 'ok' */
export type ApiSuccess<T = unknown> = {
  code: 0;
  msg: 'ok';
  data: T;
};

/** 错误响应：code 非 0，data 为 null */
export type ApiError = {
  code: number;
  msg: string;
  data: null;
};

/**
 * 判断是否为成功响应
 *
 * 使用类型守卫，TypeScript 会自动将 res 的类型收窄为 ApiSuccess<T>。
 */
export function isSuccess<T>(res: ApiResponse<T>): res is ApiSuccess<T> {
  return res.code === 0;
}

/**
 * 判断是否为错误响应
 *
 * 使用类型守卫，TypeScript 会自动将 res 的类型收窄为 ApiError。
 */
export function isError(res: ApiResponse): res is ApiError {
  return res.code !== 0;
}
