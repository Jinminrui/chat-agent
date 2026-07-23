import type { User } from "@chat-agent/shared";

// 重新导出 User 类型，保持类型来源的一致性
export type { User };

/** 登录请求参数 */
export type LoginRequest = {
  /** 邮箱或用户名 */
  emailOrUsername: string;
  /** 密码 */
  password: string;
};

/** 注册请求参数 */
export type RegisterRequest = {
  /** 用户名（唯一） */
  username: string;
  /** 邮箱（唯一） */
  email: string;
  /** 密码 */
  password: string;
};

/** 登录响应数据 */
export type LoginResponse = {
  /** 登录成功的用户信息 */
  user: User;
};

/** 注册响应数据 */
export type RegisterResponse = {
  /** 注册成功的用户信息 */
  user: User;
};
