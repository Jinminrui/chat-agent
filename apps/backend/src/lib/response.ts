export type ApiResponse<T = unknown> = {
  code: number;
  msg: string;
  data: T;
};

export function success<T>(data: T, msg = 'ok'): ApiResponse<T> {
  return { code: 0, msg, data };
}

export function error(code: number, msg: string, data = null): ApiResponse<null> {
  return { code, msg, data };
}
