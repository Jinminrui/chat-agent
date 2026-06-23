export type User = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
};

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
