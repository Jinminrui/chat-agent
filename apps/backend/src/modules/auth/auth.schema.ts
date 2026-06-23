export const registerBodySchema = {
  type: "object",
  required: ["username", "email", "password"],
  properties: {
    username: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8 },
  },
  additionalProperties: false,
} as const;

export const loginBodySchema = {
  type: "object",
  required: ["emailOrUsername", "password"],
  properties: {
    emailOrUsername: { type: "string", minLength: 1 },
    password: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

const userSchema = {
  type: "object",
  required: ["id", "email", "createdAt"],
  properties: {
    id: { type: "string" },
    email: { type: "string", format: "email" },
    createdAt: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const userEnvelopeSchema = {
  type: "object",
  required: ["user"],
  properties: {
    user: userSchema,
  },
  additionalProperties: false,
} as const;

export const unauthorizedSchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const successResponseSchema = {
  type: "object",
  required: ["code", "msg", "data"],
  properties: {
    code: { type: "number" },
    msg: { type: "string" },
    data: {},
  },
  additionalProperties: false,
} as const;

export const errorResponseSchema = {
  type: "object",
  required: ["code", "msg", "data"],
  properties: {
    code: { type: "number" },
    msg: { type: "string" },
    data: { type: "null" },
  },
  additionalProperties: false,
} as const;

export type RegisterBody = {
  username: string;
  email: string;
  password: string;
};

export type LoginBody = {
  emailOrUsername: string;
  password: string;
};
