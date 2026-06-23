/** 统一 API 响应结构 */
export type ApiResponse<T = unknown> = {
  code: number;
  msg: string;
  data: T;
};

/** 成功响应 */
export type ApiSuccess<T = unknown> = {
  code: 0;
  msg: 'ok';
  data: T;
};

/** 错误响应 */
export type ApiError = {
  code: number;
  msg: string;
  data: null;
};

/** 判断是否为成功响应 */
export function isSuccess<T>(res: ApiResponse<T>): res is ApiSuccess<T> {
  return res.code === 0;
}

/** 判断是否为错误响应 */
export function isError(res: ApiResponse): res is ApiError {
  return res.code !== 0;
}
