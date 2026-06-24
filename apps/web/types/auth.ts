import type { User } from "@chat-agent/shared";

export type { User };

export type LoginRequest = {
  emailOrUsername: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  user: User;
};

export type RegisterResponse = {
  user: User;
};
