import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import type { LoginBody, RegisterBody } from "./auth.schema";

type AuthUser = {
  id: string;
  email: string;
  createdAt: string | Date;
};

export async function registerUser({
  email,
  password,
}: RegisterBody): Promise<AuthUser> {
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    return await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const conflictError = new Error("EMAIL_ALREADY_EXISTS");
      conflictError.name = "EMAIL_ALREADY_EXISTS";
      throw conflictError;
    }
    throw error;
  }
}

export async function loginUser({
  emailOrUsername,
  password,
}: LoginBody): Promise<AuthUser | null> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return null;
  }

  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export async function getCurrentUser(userId: string): Promise<AuthUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });
}
