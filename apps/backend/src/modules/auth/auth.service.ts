import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import type { RegisterBody } from "./auth.schema";

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

  return prisma.user.create({
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
