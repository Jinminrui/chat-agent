export const registerBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8 },
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

export type RegisterBody = {
  email: string;
  password: string;
};
