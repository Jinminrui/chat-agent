import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";

type MockUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

const users = new Map<string, MockUserRecord>();
const registeredEmails = new Set<string>();
let nextUserId = 1;

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(
        async ({
          data,
          select,
        }: {
          data: { email: string; passwordHash: string };
          select?: Record<string, boolean>;
        }) => {
        if (registeredEmails.has(data.email)) {
          const err = new Error("Unique constraint failed") as Error & {
            code: string;
          };
          err.code = "P2002";
          throw err;
        }

        const user = {
          id: `user-${nextUserId++}`,
          email: data.email,
          passwordHash: data.passwordHash,
          createdAt: new Date().toISOString(),
        };

        users.set(user.id, user);
        registeredEmails.add(user.email);

        return {
          ...(select?.id ? { id: user.id } : {}),
          ...(select?.email ? { email: user.email } : {}),
          ...(select?.createdAt ? { createdAt: user.createdAt } : {}),
        };
      }),
      findUnique: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { id: string };
          select?: Record<string, boolean>;
        }) => {
        const user = users.get(where.id);

        if (!user) {
          return null;
        }

        return {
          ...(select?.id ? { id: user.id } : {}),
          ...(select?.email ? { email: user.email } : {}),
          ...(select?.createdAt ? { createdAt: user.createdAt } : {}),
        };
      }),
      findFirst: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { OR: Array<Record<string, string>> };
          select?: Record<string, boolean>;
        }) => {
          const found = Array.from(users.values()).find((u) =>
            where.OR.some(
              (condition: Record<string, string>) =>
                condition.email === u.email || condition.username === u.email,
            ),
          );

          if (!found) {
            return null;
          }

          return {
            ...(select?.id ? { id: found.id } : {}),
            ...(select?.email ? { email: found.email } : {}),
            ...(select?.createdAt ? { createdAt: found.createdAt } : {}),
            ...(select?.passwordHash
              ? { passwordHash: found.passwordHash }
              : {}),
          };
        },
      ),
    },
  },
}));

describe("auth routes", () => {
  beforeEach(() => {
    users.clear();
    registeredEmails.clear();
    nextUserId = 1;
  });

  it("registers and returns the current user", async () => {
    const app = buildApp();

    try {
      const register = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "demo@example.com",
          password: "password123",
        },
      });

      expect(register.statusCode).toBe(201);
      expect(register.json().user.email).toBe("demo@example.com");
      expect(register.json().user.createdAt).toEqual(expect.any(String));

      const cookies = register.cookies;
      const me = await app.inject({
        method: "GET",
        url: "/auth/me",
        cookies: {
          session: cookies[0]?.value ?? "",
        },
      });

      expect(me.statusCode).toBe(200);
      expect(me.json().user.email).toBe("demo@example.com");
      expect(me.json().user.createdAt).toEqual(expect.any(String));
    } finally {
      await app.close();
    }
  });

  it("returns 409 when registering with a duplicate email", async () => {
    const app = buildApp();

    try {
      const first = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "duplicate@example.com",
          password: "password123",
        },
      });

      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "duplicate@example.com",
          password: "password456",
        },
      });

      expect(second.statusCode).toBe(409);
      expect(second.json().message).toBe("Email already exists");
    } finally {
      await app.close();
    }
  });

  it("allows origins from WEB_ORIGIN comma-separated list", async () => {
    const previousWebOrigin = process.env.WEB_ORIGIN;
    process.env.WEB_ORIGIN = "http://localhost:3000,http://localhost:4000";

    const app = buildApp();

    try {
      const register = await app.inject({
        method: "POST",
        url: "/auth/register",
        headers: {
          origin: "http://localhost:4000",
        },
        payload: {
          email: "cors@example.com",
          password: "password123",
        },
      });

      expect(register.statusCode).toBe(201);
      expect(register.headers["access-control-allow-origin"]).toBe(
        "http://localhost:4000",
      );
    } finally {
      if (previousWebOrigin === undefined) {
        delete process.env.WEB_ORIGIN;
      } else {
        process.env.WEB_ORIGIN = previousWebOrigin;
      }

      await app.close();
    }
  });
});
